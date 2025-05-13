import { Hono } from "hono";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { AvatarGrid } from "./image";

async function generateAvatarGridImage(avatarUrls: string[]) {
  const svg = await satori(
    <AvatarGrid
      avatarUrls={avatarUrls}
      avatarSize={36}
      gap={8}
      imageWidth={700}
      imageHeight={400}
      backgroundColor="#222222"
    />,
    {
      width: 700,
      height: 400,
      fonts: [],
    }
  );

  const resvg = new Resvg(svg, {
    background: 'rgba(255, 255, 255, .0)',
    fitTo: {
      mode: 'width',
      value: 700,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  return pngBuffer;
}

const app = new Hono();

app.get("/:orgslug", async (c) => {
  const orgSlug = c.req.param("orgslug");
  const response = await fetch(`https://hcb.hackclub.com/api/v3/organizations/${orgSlug}/donations`)
  const data = await response.json();
  const avatarUrls = [...new Set(data.map((donation: any) => donation.avatar))];
  c.header('Content-Type', 'image/png');
  return c.body(await generateAvatarGridImage(avatarUrls as string[]));
});

export default app;
