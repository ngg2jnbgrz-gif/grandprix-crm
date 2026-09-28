/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output is only for the Docker image; Netlify uses its own
  // runtime, so keep default output there.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
};

export default nextConfig;
