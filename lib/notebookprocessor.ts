// lib/notebookprocessor
import { google } from 'googleapis';
import { JWT } from 'google-auth-library'; 
import axios from 'axios';
import { Stream } from 'stream'; 

export interface NotebookUploadData {
    firstName: string;
    lastName: string;
    className: string;
    notebookUrl: string;
    registrationCode: string; 
    isMentor?: boolean; 
}

export interface UploadResult {
    success: boolean;
    message: string;
    fileName?: string;
    fileId?: string;
    error?: string;
}

export interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    targetFolderId: string; 
}


class NotebookProcessor {
    private config: GoogleDriveConfig;
    private drive: any;

    constructor(config: GoogleDriveConfig) {
        if (!config.targetFolderId) {
            console.warn('⚠️ [NotebookProcessor] targetFolderId is missing. Upload will fail.');
        }
        this.config = config;
        this.initializeDrive();
    }
    
    private initializeDrive() {
        const { clientId, clientSecret, refreshToken } = this.config;

        if (!clientId || !clientSecret || !refreshToken) {
            console.error('❌ [NotebookProcessor] OAuth credentials (Client ID, Client Secret, or Refresh Token) are missing. Drive access will fail.');
            this.drive = null;  
            return;
        }

        const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret
        );

        oAuth2Client.setCredentials({
            refresh_token: refreshToken
        });

        oAuth2Client.on('tokens', (tokens) => {
            if (tokens.access_token) {
                console.log('✅ [NotebookProcessor] Access Token refreshed successfully.');
            }
        });

        this.drive = google.drive({ version: 'v3', auth: oAuth2Client });
    }
    
    private extractFileId(url: string): string | null {
        const match = url.match(/id=([a-zA-Z0-9_-]+)|drive\/([a-zA-Z0-9_-]+)/);
        return match ? (match[1] || match[2]) : null;
    }
    // ...

    private async downloadNotebookContent(fileId: string): Promise<string> {
        if (!this.drive) {
            throw new Error("Drive client not initialized. Check OAuth configuration.");
        }
        
        console.log(`🔍 [NotebookProcessor] Attempting to download notebook with File ID: ${fileId} using Drive API.`);
        
        const response = await this.drive.files.get({
            fileId: fileId,
            alt: 'media' 
        }, {
            responseType: 'text'  
        });

        const notebookContent = response.data as string;

        if (!notebookContent || !notebookContent.includes('"nbformat"')) {
            throw new Error("Download failed or returned non-notebook content. Confirm the file is a Jupyter notebook (.ipynb) and is accessible via OAuth.");
        }

        return notebookContent;
    }

    private createNewFilename(data: NotebookUploadData): string {
        const cleanedFirstName = data.firstName.replace(/\s/g, '');
        const cleanedLastName = data.lastName.replace(/\s/g, '');
        
        const classMatch = data.className.match(/Class\s*\d+/i);
        let classIdentifier = '';

        if (classMatch) {
            classIdentifier = classMatch[0].replace(/\s/g, '');
        } else {
            console.warn(`⚠️ Could not find 'Class X' format in class name: ${data.className}. Using generic clean.`);
            classIdentifier = data.className.replace(/[^a-zA-Z0-9]/g, '');
        }
        
        return `${cleanedFirstName}_${cleanedLastName}_${classIdentifier}.ipynb`;
    }
    
    private extractClassFolderName(className: string): string {
        const match = className.match(/Class\s*\d+/i);
        if (match) {
            return match[0].trim();
        }
        return "Unsorted Notebooks";
    }

    
    private async findOrCreateSubfolder(parentFolderId: string, folderName: string): Promise<string> {
        const searchResponse = await this.drive.files.list({
            q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false`,
            fields: 'files(id)',
        });

        if (searchResponse.data.files && searchResponse.data.files.length > 0) {
            const folderId = searchResponse.data.files[0].id;
            // console.log(`🔍 [NotebookProcessor] Found existing folder for '${folderName}': ${folderId}`);
            return folderId;
        }

        console.log(`⚠️ [NotebookProcessor] Folder for '${folderName}' not found in parent ${parentFolderId}. Creating new folder...`);
        const createResponse = await this.drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId],
            },
            fields: 'id',
        });

        const newFolderId = createResponse.data.id;
        console.log(`✅ [NotebookProcessor] Created new folder: ${newFolderId}`);
        return newFolderId;
    }

   
    private async findExistingFile(folderId: string, fileName: string): Promise<string | null> {
        const q = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
        
        const response = await this.drive.files.list({
            q: q,
            fields: 'files(id, name)',
            spaces: 'drive',
        });
        
        if (response.data.files && response.data.files.length > 0) {
            console.log(`🔍 [NotebookProcessor] Found existing file: ${response.data.files[0].id}`);
            return response.data.files[0].id;
        }
        return null;
    }


    async processAndUploadNotebook(data: NotebookUploadData): Promise<UploadResult> {
        if (!this.drive) {
            return {
                success: false,
                message: "Google Drive not configured. Check OAuth environment variables.",
                error: "ConfigError"
            };
        }

        const fileId = this.extractFileId(data.notebookUrl);
        if (!fileId) {
            return {
                success: false,
                message: "Invalid Colab/Drive URL. Could not extract Google Drive File ID.",
                error: "InvalidFileId"
            };
        }

        const newFileName = this.createNewFilename(data);

        try {
            // 1. Determine the root type folder (Mentors or Students)
            const roleFolderName = data.isMentor ? 'Mentors' : 'Students';
            
            // 2. Find/Create the Role Folder within the main targetFolderId
            const roleFolderId = await this.findOrCreateSubfolder(
                this.config.targetFolderId, 
                roleFolderName
            );

            // 3. Determine the class folder name
            const classFolderName = this.extractClassFolderName(data.className);
            
            // 4. Find/Create the Class Folder within the Role Folder
            const targetParentFolderId = await this.findOrCreateSubfolder(
                roleFolderId,
                classFolderName
            );
            
            // 5. Download the notebook content
            const notebookContent = await this.downloadNotebookContent(fileId);
            
            // 6. Check for existing file
            const existingFileId = await this.findExistingFile(targetParentFolderId, newFileName);
            
            let uploadedFile;
            let operationMessage;
            
            // Convert content string to a stream for uploading
            const contentStream = new Stream.Readable();
            contentStream.push(notebookContent);
            contentStream.push(null);

            if (existingFileId) {
                // UPDATE existing file
                console.log(`🔄 [NotebookProcessor] Updating existing file: ${existingFileId}`);
                const updateResponse = await this.drive.files.update({
                    fileId: existingFileId,
                    media: {
                        mimeType: 'application/x-ipynb+json',
                        body: contentStream,
                    },
                });
                uploadedFile = updateResponse.data;
                operationMessage = `Notebook successfully updated as ${newFileName} in ${classFolderName} folder.`;

            } else {
                // CREATE new file
                console.log(`⬆️ [NotebookProcessor] Creating new file: ${newFileName}`);
                const createResponse = await this.drive.files.create({
                    requestBody: {
                        name: newFileName,
                        mimeType: 'application/x-ipynb+json',
                        parents: [targetParentFolderId],
                    },
                    media: {
                        mimeType: 'application/x-ipynb+json',
                        body: contentStream,
                    },
                });
                uploadedFile = createResponse.data;
                operationMessage = `Notebook successfully uploaded as ${newFileName} into ${classFolderName} folder.`;
            }

            console.log(`✅ [NotebookProcessor] Operation successful! File ID: ${uploadedFile.id}`);

            return {
                success: true,
                message: operationMessage,
                fileName: newFileName,
                fileId: uploadedFile.id,
            };

        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            console.error('❌ [NotebookProcessor] Upload/Download failed:', errorMessage, error);
            
            return {
                success: false,
                message: `Failed to process and upload notebook: ${errorMessage}`,
                fileName: newFileName,
                error: errorMessage
            };
        }
    }
} 


export const NOTEBOOK_FOLDER_ID = process.env.NEXT_PUBLIC_NOTEBOOK_FOLDER_ID;

export const notebookProcessor = new NotebookProcessor({
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || '',
    refreshToken: process.env.NEXT_PUBLIC_GOOGLE_REFRESH_TOKEN || '',  
    targetFolderId: NOTEBOOK_FOLDER_ID || '', 
});

export const isNotebookProcessorConfigured = (): boolean => {
    return !!(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&  
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET &&
        process.env.NEXT_PUBLIC_GOOGLE_REFRESH_TOKEN &&
        process.env.NEXT_PUBLIC_NOTEBOOK_FOLDER_ID
    );
};
