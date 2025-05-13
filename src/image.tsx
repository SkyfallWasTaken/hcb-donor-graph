import React from "react";

interface AvatarGridProps {
    avatarUrls: string[];
    avatarSize?: number;
    gap?: number;
    columns?: number;
    backgroundColor?: string;
}

export const AvatarGrid = ({
    avatarUrls,
    avatarSize = 60,
    gap = 8,
    backgroundColor = "#1a1a1a",
}: AvatarGridProps) => {
    const containerStyle: React.CSSProperties = {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: `${gap}px`,
        gap: `${gap}px`,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
    };

    const avatarStyle: React.CSSProperties = {
        width: `${avatarSize}px`,
        height: `${avatarSize}px`,
        borderRadius: "50%",
        objectFit: "cover", // Ensure the image covers the area, cropping if necessary
        border: "2px solid #4a4a4a",
    };

    return (
        <div
            style={{
                display: "flex",
                backgroundColor: backgroundColor,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div style={containerStyle}>
                {avatarUrls.map((url, index) => (
                    <img
                        key={url || index}
                        src={url}
                        alt={`Avatar ${index + 1}`}
                        style={avatarStyle}
                    />
                ))}
            </div>
        </div>
    );
};
