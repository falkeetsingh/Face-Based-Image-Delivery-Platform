import React from 'react';
import linkedinIcon from '../../assets/linkedinIcon.svg';
import instaIcon from '../../assets/instaIcon.svg';
import ShuffleText from '../reactbits/ShuffleText';
import '../../styles/mosaic.css';

const FooterSection = () => {
    return (
        <section className="mosaic-section mosaic-footer-section" id="footer">
            <div className="mosaic-footer-container">
                {/* Red Banner */}
                <div className="mosaic-footer-banner">
                    <div className="mosaic-footer-banner-text">
                        <ShuffleText
                            text="MOSAIC"
                            className="mosaic-footer-logo pixel-font"
                            shuffleTimes={2}
                            stagger={0.14}
                        />
                        <ShuffleText
                            text="Beta"
                            className="mosaic-footer-beta pixel-font"
                            shuffleTimes={2}
                            stagger={0.14}
                        />
                    </div>
                </div>

                {/* Main Content (Devs & Socials) */}
                <div className="mosaic-footer-main">
                    <div className="mosaic-footer-devs">
                        <span className="dev-label">Developers :</span>
                        <div className="dev-list">
                            <div className="dev-item">
                                <span className="dev-bullet"></span>
                                <span className="dev-name">Falkeet Singh</span>
                            </div>
                            <div className="dev-item">
                                <span className="dev-bullet"></span>
                                <span className="dev-name">Angaddeep Singh</span>
                            </div>
                        </div>
                    </div>

                    <div className="mosaic-footer-socials">
                        <a href="#">
                            <img src={linkedinIcon} alt="LinkedIn" className="social-icon" />
                        </a>
                        <a href="#">
                            <img src={instaIcon} alt="Instagram" className="social-icon" />
                        </a>
                    </div>
                </div>

                {/* Dashed Divider */}
                <div className="mosaic-footer-divider"></div>

                {/* Legal Links */}
                <div className="mosaic-footer-legal">
                    <a href="#" className="legal-link">Privacy policy</a>
                    <a href="#" className="legal-link">Contact Us</a>
                </div>
            </div>
        </section>
    );
};

export default FooterSection;
