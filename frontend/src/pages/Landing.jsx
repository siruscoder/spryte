import { Link } from 'react-router-dom'
import {
  Sparkles,
  Move,
  Wand2,
  Link2,
  Download,
  Zap,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: Move,
    title: 'Spatial Organization',
    description:
      'Arrange your thoughts freely on an infinite canvas. Drag, resize, and position notes exactly where they make sense to you.',
  },
  {
    icon: Wand2,
    title: 'AI-Powered Transformations',
    description:
      'Rewrite for clarity, summarize, expand, or convert to bullet points with a single click using AI.',
  },
  {
    icon: Link2,
    title: 'Connected Thinking',
    description:
      'Link related notes together. See connections between ideas and navigate your knowledge graph effortlessly.',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description:
      'Export your canvas as PNG, PDF, or Markdown. Your notes, your format, your choice.',
  },
]

export default function Landing() {
  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Spatial note-taking reimagined
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Think{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              spatially
            </span>
            , write{' '}
            <span className="bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent">
              intelligently
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Spryte transforms how you capture and organize ideas. Each sentence
            becomes a movable object on an infinite canvas, enhanced by AI to
            help you think clearer and write better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-3 flex items-center justify-center gap-2"
            >
              Start for free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="btn-secondary text-lg px-8 py-3"
            >
              Learn more
            </a>
          </div>
        </div>

        {/* Hero illustration */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 text-center text-sm text-gray-500">
                My Research Notes
              </div>
            </div>
            <div className="p-8 bg-gradient-to-br from-gray-50 to-white min-h-[300px] relative">
              {/* Sample notes on canvas */}
              <div className="absolute top-8 left-8 bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-sm max-w-xs transform -rotate-1">
                <p className="text-sm text-gray-700">
                  The key insight is that spatial organization mirrors how our
                  brains naturally process information.
                </p>
              </div>
              <div className="absolute top-16 right-12 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-sm max-w-xs transform rotate-1">
                <p className="text-sm text-gray-700">
                  AI can help transform rough ideas into polished prose.
                </p>
              </div>
              <div className="absolute bottom-12 left-1/4 bg-green-100 border border-green-300 rounded-lg p-4 shadow-sm max-w-xs">
                <p className="text-sm text-gray-700">
                  Connected notes create a knowledge graph of your thinking.
                </p>
              </div>
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1="200"
                  y1="80"
                  x2="350"
                  y2="100"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
                <line
                  x1="350"
                  y1="130"
                  x2="280"
                  y2="220"
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to think better
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Spryte combines the freedom of a whiteboard with the power of AI
              to help you capture, organize, and refine your ideas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-2xl p-12 text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to transform your note-taking?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
              Join thousands of thinkers who use Spryte to organize their ideas
              spatially and write with AI assistance.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get started for free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
