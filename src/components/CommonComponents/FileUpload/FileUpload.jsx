import React, { useState } from 'react';
/* CSS will be added to FileUpload.css */
import "./FileUpload.css";

const FileUpload = () => {
    const [folders, setFolders] = useState([
        { id: 1, name: 'Documents', items: 12, type: 'folder', starred: false },
        { id: 2, name: 'Images', items: 45, type: 'folder', starred: true },
        { id: 3, name: 'Videos', items: 8, type: 'folder', starred: false },
    ]);

    const [files, setFiles] = useState([
        { id: 1, name: 'Presentation.pptx', size: '2.5 MB', type: 'file', starred: false },
        { id: 2, name: 'Report.pdf', size: '1.2 MB', type: 'file', starred: false },
        { id: 3, name: 'Image001.jpg', size: '3.8 MB', type: 'file', starred: true },
    ]);

    const [currentPath, setCurrentPath] = useState(['My Drive']);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [recycleBin, setRecycleBin] = useState([]);

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            const newFolder = {
                id: Date.now(),
                name: newFolderName,
                items: 0,
                type: 'folder',
                starred: false
            };
            setFolders([...folders, newFolder]);
            setNewFolderName('');
            setShowNewFolderInput(false);
        }
    };

    const handleDeleteItem = (item) => {
        if (item.type === 'folder') {
            setFolders(folders.filter(f => f.id !== item.id));
        } else {
            setFiles(files.filter(f => f.id !== item.id));
        }
        setRecycleBin([...recycleBin, { ...item, deletedAt: new Date() }]);
    };

    const toggleStar = (item) => {
        if (item.type === 'folder') {
            setFolders(folders.map(f =>
                f.id === item.id ? { ...f, starred: !f.starred } : f
            ));
        } else {
            setFiles(files.map(f =>
                f.id === item.id ? { ...f, starred: !f.starred } : f
            ));
        }
    };

    const DropdownMenu = ({ item, onClose }) => (
        <div className="dropdown-menu">
            <div className="dropdown-item" onClick={() => { toggleStar(item); onClose(); }}>
                ⭐ {item.starred ? 'Remove from starred' : 'Add to starred'}
            </div>
            <div className="dropdown-item" onClick={onClose}>
                🔗 Share
            </div>
            <div className="dropdown-item" onClick={onClose}>
                ℹ️ Details
            </div>
            <div className="dropdown-item" onClick={onClose}>
                ⬇️ Download
            </div>
            <div className="dropdown-item dropdown-item-danger" onClick={() => { handleDeleteItem(item); onClose(); }}>
                🗑️ Delete
            </div>
        </div>
    );

    const ItemCard = ({ item }) => {
        const [showDropdown, setShowDropdown] = useState(false);

        return (
            <div className="drive-item">
                <div className="drive-item-header">
                    {item.type === 'folder' ? (
                        <svg className="drive-item-icon folder-icon" viewBox="0 0 48 48" fill="#4CAF50">
                            <path d="M40 8H24l-4-4H4c-2.21 0-3.98 1.79-3.98 4L0 40c0 2.21 1.77 4 3.98 4h40c2.21 0 4-1.79 4-4V12c0-2.21-1.79-4-4-4z" />
                        </svg>
                    ) : (
                        <svg className="drive-item-icon file-icon" viewBox="0 0 48 48" fill="#2196F3">
                            <path d="M40 8H20L12 0H0v40h40V8zM28 8v8h8V8h-8z" />
                        </svg>
                    )}
                    <div className="drive-item-actions">
                        <svg
                            className={`star-icon ${item.starred ? 'starred' : ''}`}
                            width="20" height="20"
                            viewBox="0 0 24 24" fill={item.starred ? "#FFD700" : "currentColor"}
                            onClick={() => toggleStar(item)}
                            style={{ cursor: 'pointer' }}
                        >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <div className="dropdown-container">
                            <svg
                                className="more-icon"
                                width="20" height="20"
                                viewBox="0 0 24 24" fill="currentColor"
                                onClick={() => setShowDropdown(!showDropdown)}
                                style={{ cursor: 'pointer' }}
                            >
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                                <circle cx="5" cy="12" r="2" />
                            </svg>
                            {showDropdown && (
                                <>
                                    <div className="dropdown-overlay" onClick={() => setShowDropdown(false)} />
                                    <DropdownMenu item={item} onClose={() => setShowDropdown(false)} />
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="drive-item-content">
                    <div className="drive-item-name">{item.name}</div>
                    <div className="drive-item-meta">
                        {item.type === 'folder' ? `${item.items} items` : item.size}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="drive-container">
            {/* Header */}
            <div className="drive-header">
                <div className="drive-title">
                    <svg style={{ width: '24px', height: '24px', marginRight: '12px' }} viewBox="0 0 24 24" fill="#4CAF50">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <h2>My Drive</h2>
                </div>
                <div className="drive-actions">
                    <button
                        className="btn-new-folder"
                        onClick={() => setShowNewFolderInput(true)}
                    >
                        📁 New Folder
                    </button>
                    <label htmlFor="upload-input" className="btn-upload">
                        ⬆️ Upload
                    </label>
                    <input
                        type="file"
                        style={{ display: 'none' }}
                        id="upload-input"
                        multiple
                    />
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="breadcrumb">
                {currentPath.map((path, index) => (
                    <span key={index}>
                        {index > 0 && <span className="breadcrumb-separator">/</span>}
                        <span className="breadcrumb-item">{path}</span>
                    </span>
                ))}
            </div>

            {/* New Folder Input */}
            {showNewFolderInput && (
                <div className="new-folder-modal">
                    <div className="new-folder-modal-content">
                        <h3>📁 New Folder</h3>
                        <input
                            type="text"
                            placeholder="Folder name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                            autoFocus
                            className="new-folder-input"
                        />
                        <div className="new-folder-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => {
                                    setShowNewFolderInput(false);
                                    setNewFolderName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-create"
                                onClick={handleCreateFolder}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Drive Content */}
            <div className="drive-content">
                {/* Folders Section */}
                {folders.length > 0 && (
                    <div className="drive-section">
                        <div className="section-header">
                            📁 Folders
                        </div>
                        <div className="drive-grid">
                            {folders.map(folder => (
                                <ItemCard key={folder.id} item={folder} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Files Section */}
                {files.length > 0 && (
                    <div className="drive-section">
                        <div className="section-header">
                            📄 Files
                        </div>
                        <div className="drive-grid">
                            {files.map(file => (
                                <ItemCard key={file.id} item={file} />
                            ))}
                        </div>
                    </div>
                )}

                {folders.length === 0 && files.length === 0 && (
                    <div className="empty-state">
                        <svg style={{ width: '64px', height: '64px', opacity: 0.3 }} viewBox="0 0 24 24" fill="#666">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <p>No files or folders yet</p>
                        <p className="empty-state-subtitle">Create a folder or upload files to get started</p>
                    </div>
                )}
            </div>

            {/* Recycle Bin Info */}
            <div className="recycle-bin-info">
                🗑️ Recycle Bin ({recycleBin.length} items)
            </div>

            {/* 
      COMMENTED OUT - EXISTING FUNCTIONALITY (TO BE INTEGRATED LATER)
      
      const [file, setFile] = useState(null);
      const [fileName, setFileName] = useState('');
      const [fileSize, setFileSize] = useState('');
      const [isUploading, setIsUploading] = useState(false);
      const [uploadImage, { }] = useUploadImageMutation();
      const { data: imagesData, isLoading: isFetchingImages, refetch: refetchImages } = useFetchImagesQuery();
      const theme = useSelector(selectTheme);

      useEffect(() => {
        refetchImages();
      }, [refetchImages]);

      const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
          setFile(selectedFile);
          setFileName(selectedFile.name);
          setFileSize(formatFileSize(selectedFile.size));
        }
      };

      const handleUpload = async () => {
        if (!file) {
          message.error('Select a file');
          return;
        }
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          const response = await uploadImage(formData).unwrap();
          if (response.success) {
            message.success('Uploaded!');
            setFile(null);
            setFileName('');
            setFileSize('');
            document.getElementById('fileInput').value = '';
            refetchImages();
          } else {
            message.error('Upload failed');
          }
        } catch (error) {
          message.error('Upload failed');
        } finally {
          setIsUploading(false);
        }
      };
      */}
        </div>
    );
};

export default FileUpload;
