import React from 'react';
import MosaicLogo from '../../assets/MosaicLogo.svg';
import '../../styles/mosaic.css';

const FloatingHeader = ({ isAuthed, handleLogout }) => {
    return (
        <div className="mosaic-header-container">
            <div className="mosaic-header-pill">
                <a href="/" className="mosaic-logo" style={{ cursor: 'pointer', display: 'block', textDecoration: 'none' }}>
                    <img src={MosaicLogo} alt="MOSAIC Logo" className="mosaic-logo-img" />
                </a>
                <div className="mosaic-nav">
                    <a href="/" className="mosaic-nav-link" style={{ fontWeight: 400 }}>Home</a>
                    {isAuthed ? (
                        <a onClick={handleLogout} className="mosaic-nav-link" style={{ fontWeight: 400, cursor: 'pointer' }}>Logout</a>
                    ) : (
                        <a href="/login" className="mosaic-nav-link" style={{ fontWeight: 400 }}>Login</a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FloatingHeader;
