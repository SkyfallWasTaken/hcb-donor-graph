import { readFile } from "node:fs/promises";
import React from "react";
import satori, { SatoriOptions } from "satori";
import sharp from "sharp";

const width = 700;
const height = 120;

function Message({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                width: `${width}px`,
                height: `${height}px`,
                paddingLeft: "24px",
                paddingRight: "24px",
                backgroundColor: "#1a1a1a",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#888888",
                fontSize: 28,
                fontFamily: "Inter",
                textAlign: "center",
            }}
        >
            {children}
        </div>
    )
}

function NoDonors({ orgName }: { orgName: string }) {
    return (
        <Message>
            No donors yet, be the first to donate to {orgName}!
        </Message>
    );
}

const satoriOptions = {
    width,
    height,
    fonts: [
        {
            name: "Inter",
            data: await readFile("fonts/Inter-SemiBold.ttf"),
            weight: 400,
            style: "normal",
        },
    ],
};
async function generateMessage(children: React.ReactNode): Promise<Buffer> {
    const svg = await satori(
        children,
        satoriOptions as SatoriOptions
    );
    return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}

export async function generateNoDonorsImage(orgName: string): Promise<Buffer> {
    const message = <NoDonors orgName={orgName} />;
    return await generateMessage(message);
}