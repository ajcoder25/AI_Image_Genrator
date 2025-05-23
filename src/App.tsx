import { useState, useEffect } from 'react'
import './App.css'

interface GeneratedImage {
  url: string;
  id: string;
}

interface PromptHistory {
  prompt: string;
  timestamp: number;
}

const STABILITY_API_KEY = 'sk-bKRtbFSjToDbu2K2ii2GKbOjAnAtdEbVPvT1nNeZ6G4E09B5';
const MAX_CHARS = 1000;
const MAX_HISTORY = 5;

const STYLE_PRESETS = [
  { name: 'analog-film', displayName: 'Analog Film', prefix: 'vintage photograph, film grain, ' },
  { name: 'anime', displayName: 'Anime', prefix: 'anime artwork, manga style, ' },
  { name: 'cinematic', displayName: 'Cinematic', prefix: 'cinematic scene, movie quality, ' },
  { name: 'comic-book', displayName: 'Comic Book', prefix: 'comic book art style, ' },
  { name: 'digital-art', displayName: 'Digital Art', prefix: 'digital artwork, ' },
  { name: 'enhance', displayName: 'Enhanced', prefix: 'enhanced quality, ' },
  { name: 'fantasy-art', displayName: 'Fantasy', prefix: 'fantasy artwork, ' },
  { name: 'isometric', displayName: 'Isometric', prefix: 'isometric design, ' },
  { name: 'line-art', displayName: 'Line Art', prefix: 'line art, ' },
  { name: 'low-poly', displayName: 'Low Poly', prefix: 'low poly style, ' },
  { name: 'modeling-compound', displayName: 'Clay Art', prefix: 'clay art style, ' },
  { name: 'neon-punk', displayName: 'Neon Punk', prefix: 'neon punk style, ' },
  { name: 'origami', displayName: 'Origami', prefix: 'origami style, paper art, ' },
  { name: 'photographic', displayName: 'Photographic', prefix: 'professional photograph, ' },
  { name: 'pixel-art', displayName: 'Pixel Art', prefix: 'pixel art style, ' },
  { name: '3d-model', displayName: '3D Model', prefix: '3d model render, ' }
];

function App() {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const [promptHistory, setPromptHistory] = useState<PromptHistory[]>([])
  const [selectedStyle, setSelectedStyle] = useState('')

  useEffect(() => {
    // Load prompt history from localStorage
    const savedHistory = localStorage.getItem('promptHistory')
    if (savedHistory) {
      setPromptHistory(JSON.parse(savedHistory))
    }
  }, [])

  const saveToHistory = (newPrompt: string) => {
    const newHistory = [
      { prompt: newPrompt, timestamp: Date.now() },
      ...promptHistory
    ].slice(0, MAX_HISTORY)
    
    setPromptHistory(newHistory)
    localStorage.setItem('promptHistory', JSON.stringify(newHistory))
  }

  const generateImages = async (prompt: string) => {
    try {
      setProgress('Initializing image generation...');
      const finalPrompt = selectedStyle 
        ? `${STYLE_PRESETS.find(s => s.name === selectedStyle)?.prefix || ''}${prompt}`
        : prompt;

      const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${STABILITY_API_KEY}`
        },
        body: JSON.stringify({
          text_prompts: [{ text: finalPrompt }],
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          samples: 2,
          steps: 40,
          style_preset: selectedStyle
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your Stability AI API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(errorData.message || 'Failed to generate images');
      }

      setProgress('Processing response...');
      const data = await response.json();
      
      if (!data.artifacts || !data.artifacts.length) {
        throw new Error('No images were generated. Please try a different prompt.');
      }

      return data.artifacts.map((img: any) => ({
        url: `data:image/png;base64,${img.base64}`,
        id: Math.random().toString(36).substring(7)
      }));
    } catch (err: any) {
      console.error('Error generating images:', err);
      throw new Error(err.message || 'An unexpected error occurred');
    } finally {
      setProgress('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) {
      setError('Please enter a description for the image you want to generate.');
      return;
    }

    if (!selectedStyle) {
      setError('Please select a style preset before generating images.');
      return;
    }
    
    setIsLoading(true)
    setError('')
    setImages([])
    
    try {
      saveToHistory(prompt)
      const generatedImages = await generateImages(prompt)
      if (generatedImages && generatedImages.length > 0) {
        setImages(generatedImages)
      } else {
        setError('No images were generated. Please try again with a different description.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate images. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setPrompt(value);
    }
  };

  const handleStyleSelect = (styleName: string) => {
    setSelectedStyle(styleName === selectedStyle ? '' : styleName);
    setError(''); // Clear any existing errors when style is changed
  };

  const shareImage = async (imageUrl: string) => {
    try {
      if (navigator.share) {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const file = new File([blob], 'generated-image.png', { type: 'image/png' });
        await navigator.share({
          title: 'AI Generated Image',
          text: `Generated with prompt: ${prompt}`,
          files: [file]
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(imageUrl);
        alert('Image URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="app">
      <div className="dotted-background">
        <header className="header">
          <nav className="nav-container">
            <div className="logo-container">
              <span className="logo-icon">🎭</span>
              <div className="logo-text">
                <span className="logo-main">Image Dekho</span>
                <span className="logo-tagline">AI Image Creation Made Easy</span>
              </div>
            </div>
          </nav>
        </header>

        <main className="main-content">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="style-selection">
              <h3 className="style-heading">Choose a Style:</h3>
              <div className="style-presets">
                {STYLE_PRESETS.map(style => (
                  <button
                    key={style.name}
                    type="button"
                    className={`style-preset-button ${selectedStyle === style.name ? 'active' : ''}`}
                    onClick={() => handleStyleSelect(style.name)}
                  >
                    {style.displayName}
                  </button>
                ))}
              </div>
              {!selectedStyle && <p className="style-hint">👆 Select a style preset to continue</p>}
            </div>

            <div className="input-group">
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="Describe the image you want to generate..."
                className="prompt-input"
                required
                minLength={3}
              />
              <div className="char-count">
                {prompt.length}/{MAX_CHARS}
              </div>
            </div>

            {promptHistory.length > 0 && (
              <div className="prompt-history">
                <h3>Recent Prompts:</h3>
                <div className="history-items">
                  {promptHistory.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className="history-item"
                      onClick={() => setPrompt(item.prompt)}
                    >
                      {item.prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="generate-button"
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? 'Generating...' : 'Generate Images'}
            </button>
          </form>

          {error && <div className="error-message">{error}</div>}
          {progress && <div className="progress-message">{progress}</div>}

          <div className="image-grid">
            {isLoading ? (
              Array(4).fill(null).map((_, index) => (
                <div key={index} className="image-card loading">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">Generating image {index + 1}/4...</div>
                </div>
              ))
            ) : (
              images.map((image) => (
                <div key={image.id} className="image-card">
                  <img 
                    src={image.url} 
                    alt={prompt} 
                    loading="lazy"
                    className="generated-image"
                  />
                  <div className="image-overlay">
                    <div className="image-actions">
                      <button 
                        className="action-button download-button"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = image.url;
                          link.download = `generated-image-${image.id}.png`;
                          link.click();
                        }}
                      >
                        💾 Download
                      </button>
                      <button 
                        className="action-button share-button"
                        onClick={() => shareImage(image.url)}
                      >
                        📤 Share
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
