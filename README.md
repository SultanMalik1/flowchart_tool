<div align="center">
  <img src="public/logo.png" alt="FlowChart AI Logo" width="120" height="120">

  # FlowChart AI

  **Transform Ideas into Professional Flowcharts with AI**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)

  [🌐 Live Demo](https://flowchartai.org) • [📖 Documentation](#documentation) • [🚀 Self-Host](#self-hosting-guide) • [💬 Discord](https://discord.gg/Pfdyhqqu)
</div>

---

## 🎯 What is FlowChart AI?

FlowChart AI is an **open-source, AI-powered flowchart generator** that transforms natural language descriptions into professional, editable diagrams. Built with modern web technologies, it combines the power of AI with an intuitive drag-and-drop interface to make flowchart creation effortless.

### ✨ Key Features

- **🤖 AI-Powered Generation**: Describe your process in plain language, get a professional flowchart instantly
- **🎨 Interactive Canvas**: Built on Excalidraw for smooth, collaborative editing experience
- **💾 Personal Workspace**: Save, organize, and manage all your diagrams in one place
- **🔄 Version Control**: Track changes and manage diagram versions
- **📤 Multiple Export Formats**: Export to Excalidraw, PNG, SVG, and PDF (coming soon)
- **🌍 Multi-language Support**: Create flowcharts in any language you're comfortable with
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🔒 Privacy-First**: Self-hostable with complete data control

### 🎬 See It In Action

![FlowChart AI Demo](https://cdn.flowchartai.org/static/demo.mp4)

*From idea to flowchart in seconds - no design skills required*

## 🚀 Quick Start

### Option 1: Use Our Hosted Version
Visit [flowchartai.org](https://flowchartai.org) and start creating flowcharts immediately.

### Option 2: Self-Host (Recommended for Privacy)
Follow our [Self-Hosting Guide](#self-hosting-guide) below to run FlowChart AI on your own infrastructure.

## 🛠️ Technology Stack

FlowChart AI is built with modern, production-ready technologies:

- **Frontend**: Next.js 15, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI components
- **Canvas**: Excalidraw integration with Mermaid support
- **AI**: Mastra agents through the Groq API (`GROQ_API_KEY`)
- **Storage**: local JSON files in `.data/flowcharts`
- **Deployment**: Vercel

## 🎯 Use Cases

FlowChart AI is perfect for:

- **📊 Business Process Mapping**: Document workflows, decision trees, and operational procedures
- **💻 Software Architecture**: Design system flows, API integrations, and database relationships
- **📚 Education & Training**: Create learning materials, concept maps, and curriculum flows
- **🚀 Startup Planning**: Visualize business models, user journeys, and go-to-market strategies
- **📋 Project Management**: Plan project timelines, resource allocation, and team workflows
- **🔬 Research & Analysis**: Map out research processes, data flows, and analytical frameworks

## 🏠 Self-Hosting Guide

### Prerequisites

Before you begin, ensure you have:

- **Node.js 22.13+** and **pnpm** installed
- **Groq API key** for AI functionality

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/tanchaowen84/flowchartai.git
cd flowchartai

# Install dependencies
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env.local
```

Edit `.env.local`. The only required value is a Groq key:

```env
GROQ_API_KEY="your-groq-api-key"
```

Diagrams are saved as JSON files in `.data/flowcharts`. No database, login, or payment account is required.

Optional overrides (any Groq model id):

```env
FLOWCHART_TEXT_MODEL="openai/gpt-oss-120b"
FLOWCHART_IMAGE_MODEL="qwen/qwen3.8-27b"
```

`RESEND_API_KEY` is only needed if you use the newsletter or contact forms.

### 3. Groq API

1. Create an API key at [Groq Console](https://console.groq.com/keys)
2. Add it as `GROQ_API_KEY` in `.env.local`

### 4. Run Development Server

```bash
# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see your FlowChart AI instance!

### 5. Production Deployment

#### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Configure custom domain (optional)
```

#### Deploy to Your Own Server

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### 6. Configuration Options

#### Feature Toggles
Customize which features are enabled in `src/config/website.tsx`:

```typescript
features: {
  enableDocsPage: false,        // Documentation pages
  enableAIPages: false,         // AI showcase pages
  enableDiscordWidget: false,   // Discord integration
}
```

## 🔧 Customization

### Branding
- Replace `public/logo.png` with your logo
- Update `src/config/website.tsx` for site metadata
- Modify `messages/en.json` for text content

### AI Models
Requests go to Groq. Defaults live in `src/lib/ai-models.ts`:

```typescript
export const TEXT_TO_FLOWCHART_MODEL = 'openai/gpt-oss-120b';
export const IMAGE_TO_FLOWCHART_MODEL = 'qwen/qwen3.8-27b';
```

Override either model with `FLOWCHART_TEXT_MODEL` or `FLOWCHART_IMAGE_MODEL` in `.env.local`. Use a vision-capable Groq model for image mode.

### Styling
- Built with Tailwind CSS 4
- Customize themes in `tailwind.config.js`
- Component styles in `src/components/ui/`

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute

- 🐛 **Report Bugs**: [Open an issue](https://github.com/tanchaowen84/flowchartai/issues) with detailed reproduction steps
- 💡 **Feature Requests**: Share your ideas for new features or improvements
- 🔧 **Code Contributions**: Submit pull requests for bug fixes or new features
- 📖 **Documentation**: Help improve our documentation and guides
- 🌍 **Translations**: Add support for new languages

### Development Setup

```bash
# Fork the repository and clone your fork
git clone https://github.com/YOUR_USERNAME/flowchartai.git
cd flowchartai

# Install dependencies
pnpm install

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes and test thoroughly
pnpm dev

# Commit your changes
git commit -m "feat: add your feature description"

# Push to your fork and create a pull request
git push origin feature/your-feature-name
```

### Code Style

- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Write **meaningful commit messages** following conventional commits
- Add **JSDoc comments** for public functions
- Ensure **responsive design** for UI changes

## 🐛 Troubleshooting

### Common Issues

#### AI Generation Not Working
- Confirm `GROQ_API_KEY` is set in `.env.local` and restart `pnpm dev`
- Check the Groq console for quota or rate-limit errors
- Image mode needs a vision model (`FLOWCHART_IMAGE_MODEL`)

#### Saved Diagrams
- Files live in `.data/flowcharts` (or `FLOWCHART_DATA_DIR`)
- Deleting that folder removes local diagrams

#### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Getting Help

- 📖 Check our [documentation](#documentation)
- 💬 Join our [Discord community](https://discord.gg/Pfdyhqqu)
- 🐛 [Open an issue](https://github.com/tanchaowen84/flowchartai/issues) on GitHub
- 📧 Email us at [support@flowchartai.org](mailto:support@flowchartai.org)

## 🔒 Security

### Reporting Security Issues

If you discover a security vulnerability, please email us at [support@flowchartai.org](mailto:support@flowchartai.org) instead of opening a public issue.

### Security Features

- **Authentication**: Secure OAuth integration with major providers
- **Data Encryption**: All data encrypted in transit and at rest
- **API Security**: Rate limiting and request validation
- **Privacy**: No tracking, minimal data collection
- **Self-Hosting**: Complete data control and privacy

## 📄 License

FlowChart AI is open source software licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2025 FlowChart AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Acknowledgments

FlowChart AI is built on the shoulders of amazing open source projects:

- **[Excalidraw](https://excalidraw.com/)** - The amazing drawing canvas that powers our editor
- **[Next.js](https://nextjs.org/)** - The React framework for production
- **[Tailwind CSS](https://tailwindcss.com/)** - The utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Low-level UI primitives
- **[Drizzle ORM](https://orm.drizzle.team/)** - TypeScript ORM for SQL databases
- **[Better Auth](https://www.better-auth.com/)** - Modern authentication library

Special thanks to the [MkSaaS](https://mksaas.com) template that provided the foundation for this project.

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=tanchaowen84/flowchartai&type=Date)](https://star-history.com/#tanchaowen84/flowchartai&Date)

---

<div align="center">
  <p>Made with ❤️ by the FlowChart AI team</p>
  <p>
    <a href="https://flowchartai.org">Website</a> •
    <a href="https://github.com/tanchaowen84/flowchartai">GitHub</a> •
    <a href="https://discord.gg/Pfdyhqqu">Discord</a> •
    <a href="https://x.com/tanchaowen84">Twitter</a>
  </p>
</div>
