// Vercel serverless endpoint: keeps the ImgBB API key out of browser code.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Image uploads are not configured yet." });
  }

  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("image/")) {
    return res.status(415).json({ error: "Please upload an image." });
  }

  try {
    const chunks = [];
    let total = 0;
    for await (const chunk of req) {
      total += chunk.length;
      if (total > 4 * 1024 * 1024) {
        return res.status(413).json({ error: "Compressed image is too large. Please choose a smaller image." });
      }
      chunks.push(chunk);
    }

    if (!total) {
      return res.status(400).json({ error: "No image was received." });
    }

    const image = Buffer.concat(chunks).toString("base64");
    const body = new URLSearchParams({ image });
    const upstream = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(20000)
      }
    );

    const result = await upstream.json().catch(() => null);
    if (!upstream.ok || !result?.success || !result?.data?.url) {
      return res.status(502).json({ error: "The image host could not complete the upload. Please try again." });
    }

    return res.status(200).json({ url: result.data.url });
  } catch {
    return res.status(500).json({ error: "Image upload failed. Please try again." });
  }
}
