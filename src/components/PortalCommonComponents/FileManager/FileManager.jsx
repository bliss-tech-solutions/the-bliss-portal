import React from 'react'
import './FileManager.css'
import {
  FiPlay,
  FiMusic,
  FiFileText,
  FiArchive,
  FiMic,
  FiFolder,
  FiGrid,
  FiList,
  FiShare2,
  FiStar
} from 'react-icons/fi'

const categories = [
  { id: 1, icon: <FiPlay />, title: 'Video', meta: '77.8 gb Total' },
  { id: 2, icon: <FiMusic />, title: 'Audio', meta: '98.8 gb Total' },
  { id: 3, icon: <FiFileText />, title: 'Documents', meta: '100.2 mb Total' },
  { id: 4, icon: <FiArchive />, title: 'Archive', meta: '1,180 mb Total' },
  { id: 5, icon: <FiMic />, title: 'Recordings', meta: '778 mb Total' }
]

const folders = [
  'Documents',
  'Work',
  'Projects',
  'Secret',
  'Video',
  'Client',
  'Cheat_Codes',
  'Invoice & Payment',
  'React_COMPONENT',
  'SaaS Webapp Image',
  'Landing Page HTML',
  'Images & Gallery'
]

export default function FileManager () {
  return (
    <div className="file-manager portal-container">
      <div className="fm-top theme-card">
        <div className="fm-user">
          <div className="fm-avatar">A</div>
          <div>
            <div className="fm-greeting">Good Morning, Azunyan!</div>
            <div className="fm-user-meta">
              <span className="meta-item">188 gb</span>
              <span className="meta-item">Pro Member</span>
              <span className="meta-item">78% Space Left</span>
            </div>
          </div>
        </div>
        {/* <div className="fm-actions">
          <button className="global-secondary-btn"><FiShare2 />&nbsp;Share</button>
          <button className="global-action-btn"><FiStar />&nbsp;Go Pro</button>
        </div> */}
      </div>

      <h4 className="fm-section-title">Browse By Category</h4>
      <div className="fm-categories">
        {categories.map(c => (
          <div key={c.id} className="category-card theme-card">
            <div className="cat-icon">{c.icon}</div>
            <div className="cat-title">{c.title}</div>
            <div className="cat-meta">{c.meta}</div>
          </div>
        ))}
      </div>

      <div className="fm-list-header">
        <h4 className="fm-section-title">Browse All Files</h4>
        <div className="fm-controls">
          <div className="theme-text-secondary">Newest First</div>
          <div className="view-toggle">
            <FiGrid />
            <FiList />
          </div>
        </div>
      </div>

      <div className="fm-folders">
        {folders.map((f, idx) => (
          <div key={idx} className="folder-card theme-card">
            <div className="folder-left">
              <div className="folder-icon"><FiFolder /></div>
              <div>
                <div className="folder-name">{f}</div>
                <div className="folder-meta">{Math.floor(Math.random() * 8000)} files · {Math.floor(Math.random() * 220)} gb</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
