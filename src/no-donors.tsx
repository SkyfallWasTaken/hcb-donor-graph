import { readFile } from "node:fs/promises";
import satori from "satori";
import sharp from "sharp";

export function NoDonors({ orgName }: { orgName: string }) {
    const width = 700;
    const height = 120;

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
            No donors yet, be the first to donate to {orgName}!
        </div>
    )
}

export default async function generateNoDonorsImage(
    orgName: string
): Promise<Buffer> {
    const width = 700;
    const height = 120;
    const svg = await satori(
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
            No donors yet, be the first to donate to {orgName}!
        </div>,
        {
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
        }
    );
    return sharp(Buffer.from(svg)).png({ quality: 100 }).toBuffer();
}