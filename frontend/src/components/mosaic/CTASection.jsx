import React from 'react';
import '../../styles/mosaic.css';

const CTASection = () => {
    return (
        <section className="mosaic-section" id="cta">
            <div className="mosaic-cta-content">
                <h2 className="mosaic-cta-title">Ready to experience effortless memories?</h2>
                <p className="mosaic-cta-subtitle">
                    Scan your face, select your event, and get your album now.<br />
                    Cherish every moment with <span className="pixel-font" style={{ fontWeight: 500 }}>MOSAIC</span>!
                </p>
                <button className="mosaic-btn-primary mosaic-cta-btn" onClick={() => window.location.href = '/login'}>
                    Get Started
                </button>
            </div>
        </section>
    );
};

export default CTASection;
