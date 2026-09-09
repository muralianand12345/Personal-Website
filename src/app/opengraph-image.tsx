import { ImageResponse } from 'next/og';

export const alt = 'Murali Anand - AI Engineer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const Image = () =>
    new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    backgroundColor: '#000000',
                    padding: '80px',
                }}
            >
                <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, color: '#ffffff' }}>
                    Murali Anand
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 48,
                        color: 'rgba(255,255,255,0.7)',
                        marginTop: 12,
                    }}
                >
                    AI Engineer
                </div>
                <div
                    style={{
                        display: 'flex',
                        fontSize: 28,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 48,
                    }}
                >
                    muralianand.in
                </div>
            </div>
        ),
        size
    );

export default Image;
