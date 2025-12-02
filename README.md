This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Docker

This project includes an optimized Dockerfile following multi-stage best practices, production-only runtime, and a non-root user.

Build the image:

```bash
docker build -t consultoria:latest .
```

Run the container (with environment variables):

```bash
# Using an env file (recommended)
docker run --name consultoria \
  --env-file .env \
  -p 3000:3000 \
  consultoria:latest

# Or pass variables individually
docker run --name consultoria \
  -e NODE_ENV=production \
  -p 3000:3000 \
  consultoria:latest
```

Useful flags:

- `--pull` ensures the latest base image is used during build.
- `--no-cache` rebuilds all layers, ignoring cache.

Notes:

- The container exposes port `3000`; map it with `-p 3000:3000`.
- Do not bake secrets into the image; prefer `--env-file .env` or a secrets manager.
- For even smaller images, consider enabling Next.js `output: 'standalone'` and copying `.next/standalone` in the runtime stage.
