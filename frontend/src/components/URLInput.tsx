import React, { useState, useRef } from 'react';
import { Plus, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Props {
    onSubmit: (url: string) => void;
    onSubmitImage?: (file: File) => void;
    isLoading: boolean;
    isChatMode?: boolean;
}

export default function URLInput({ onSubmit, onSubmitImage, isLoading, isChatMode }: Props) {
    const [inputVal, setInputVal] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputVal.trim() && !isLoading && !isUploading) {
            onSubmit(inputVal.trim());
            setInputVal('');
        }
    };

    const handleClickSubmit = () => {
        if (inputVal.trim() && !isLoading && !isUploading) {
            setUploadError('');
            onSubmit(inputVal.trim());
            setInputVal('');
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError('');

        // If consumer provided a direct image handler, use it for streaming
        if (onSubmitImage) {
            onSubmitImage(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Otherwise fall back to OCR extract-then-submit flow
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiUrl}/api/extract-image`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                if (data.extracted_text) {
                    onSubmit(data.extracted_text);
                    setInputVal('');
                } else {
                    setUploadError('No readable text was found in this image.');
                }
            } else {
                console.error('Image extraction failed:', await response.text());
                setUploadError('Image analysis failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setUploadError('Connection error while uploading image.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`input-section ${isChatMode ? 'fixed-bottom' : ''}`}>
            <div className={`input-container ${(isLoading || isUploading) ? 'is-disabled' : ''}`}>
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <label htmlFor="url-input" className="sr-only">
                    Enter a news link, text, or upload an image
                </label>

                {isUploading ? (
                    <span className="icon-btn" aria-live="polite" aria-label="Uploading image">
                        <Loader2 className="input-icon input-icon-disabled spin" />
                    </span>
                ) : (
                    <button
                        type="button"
                        className="icon-btn"
                        aria-label="Upload image for analysis"
                        title="Upload image"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading || isUploading}
                    >
                        <ImageIcon className="input-icon" />
                    </button>
                )}

                <input
                    id="url-input"
                    type="text"
                    className="url-input"
                    autoFocus
                    placeholder={isUploading ? 'Extracting text from image...' : 'Drop a news link or paste the article text here...'}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isUploading}
                />

                <button
                    type="button"
                    className="icon-btn submit-btn"
                    aria-label="Submit content for verification"
                    title="Submit"
                    onClick={handleClickSubmit}
                    disabled={isLoading || isUploading || !inputVal.trim()}
                >
                    <Plus className="input-icon submit-icon" />
                </button>
            </div>
            {uploadError && (
                <p className="input-error" role="alert">
                    {uploadError}
                </p>
            )}
            <p className={`input-hint ${isChatMode ? 'hidden' : ''}`}>Unmask the truth: Paste a URL, text, or upload an image to verify!</p>
        </div>
    );
}
