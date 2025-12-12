'use client';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function VideoUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const { getToken } = useAuth();

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        try {
            console.log("File Type:", file.type); // Log 1
            // 1. Ask Backend for Presigned URL
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/presigned-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename: file.name, 
                    content_type: file.type 
                })
            });
            
            const { url, key } = await response.json();
            // console.log("Presigned URL:", data.url);

            // 2. Upload directly to S3 (PUT request)
            await fetch(url, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            alert("Upload Successful!");
            
            // TODO: Notify backend that upload is done (Phase 2)
            
        } catch (error) {
            console.error(error);
            alert("Upload Failed");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="border border-dashed border-slate-700 p-8 rounded-lg text-center mt-6">
            <input 
                type="file" 
                accept="video/*" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="mb-4 text-slate-300"
            />
            <br />
            <button 
                onClick={handleUpload}
                disabled={uploading || !file}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50"
            >
                {uploading ? "Uploading to S3..." : "Upload Video"}
            </button>
        </div>
    );
}