import { LitElement, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/loading-spinner';
import '../components/upload-placeholder';
import '../components/waiting-spinner';

/**
 * Funsies page - showcase of loading spinners and upload placeholders.
 * Used for visual tweaking and component development.
 */
@customElement('funsies-page')
export class FunsiesPage extends LitElement {
  @state() private animatedProgress = 0;
  @state() private animatedStatus: 'waiting' | 'uploading' | 'processing' = 'waiting';

  private animationTimer?: number;

  // Adopt global styles
  static createRenderRoot() {
    // Use light DOM instead of shadow DOM to inherit global styles
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.startAnimation();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
  }

  private startAnimation() {
    const cycle = () => {
      // Phase 1: Waiting for 2 seconds
      this.animatedProgress = 0;
      this.animatedStatus = 'waiting';

      setTimeout(() => {
        // Phase 2: Start uploading - fill from 0% to 100% over 2 seconds
        this.animatedStatus = 'uploading';
        let progress = 0;
        const fillInterval = setInterval(() => {
          progress += 10; // Increment by 10% every 200ms
          this.animatedProgress = Math.min(progress, 100);

          if (progress >= 100) {
            clearInterval(fillInterval);

            // Phase 3: Switch to processing for 2 seconds
            setTimeout(() => {
              this.animatedStatus = 'processing';

              // Phase 4: Restart cycle after 2 seconds
              this.animationTimer = window.setTimeout(() => {
                cycle();
              }, 2000);
            }, 200);
          }
        }, 200); // Update every 200ms to see jerkiness
      }, 2000);
    };

    cycle();
  }

  render() {
    return html`
      <style>
        .funsies-container {
          display: block;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section {
          margin-bottom: 3rem;
        }

        .spinner-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
          margin-top: 1rem;
        }

        .spinner-demo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 2rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 4px;
        }

        .spinner-demo label {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          text-align: center;
        }

        .placeholder-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-top: 1rem;
        }

        @media (max-width: 1023px) {
          .placeholder-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 639px) {
          .placeholder-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .description {
          color: var(--color-text-secondary);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .overlay-demo {
          position: relative;
          width: 200px;
          height: 200px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay-demo .spinner-layer {
          position: absolute;
          z-index: 1;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .overlay-demo .progress-layer {
          position: absolute;
          z-index: 2;
          opacity: 0.5;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>

      <div class="funsies-container">
        <h1>🎨 Funsies - Component Showcase</h1>

        <div class="section">
          <h2>Animated Upload Cycle</h2>
          <p class="description">
            Watch the full upload cycle: waiting → uploading → processing → repeat
          </p>
          <div class="placeholder-grid">
            <upload-placeholder
              filename="animated-demo.jpg"
              status=${this.animatedStatus}
              .progress=${this.animatedProgress}
            ></upload-placeholder>

            <div class="overlay-demo">
              <div class="spinner-layer">
                <loading-spinner size="large"></loading-spinner>
              </div>
              <div class="progress-layer">
                <upload-placeholder
                  filename="overlay-test.jpg"
                  status="uploading"
                  .progress=${50}
                ></upload-placeholder>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Loading Spinners</h2>
          <p class="description">
            Spinners in different sizes. Default is 40px, small is 20px, large is 60px.
          </p>
          <div class="spinner-grid">
            <div class="spinner-demo">
              <loading-spinner size="small"></loading-spinner>
              <label>Small (20px)</label>
            </div>
            <div class="spinner-demo">
              <loading-spinner size="default"></loading-spinner>
              <label>Default (40px)</label>
            </div>
            <div class="spinner-demo">
              <loading-spinner size="large"></loading-spinner>
              <label>Large (60px)</label>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Waiting Spinners</h2>
          <p class="description">
            Breathing circles for waiting states. Slowly fades in and out instead of spinning.
          </p>
          <div class="spinner-grid">
            <div class="spinner-demo">
              <waiting-spinner size="small"></waiting-spinner>
              <label>Small (20px)</label>
            </div>
            <div class="spinner-demo">
              <waiting-spinner size="default"></waiting-spinner>
              <label>Default (40px)</label>
            </div>
            <div class="spinner-demo">
              <waiting-spinner size="large"></waiting-spinner>
              <label>Large (60px)</label>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Upload Placeholders - Uploading</h2>
          <p class="description">
            Progress circles showing different upload completion percentages.
          </p>
          <div class="placeholder-grid">
            <upload-placeholder
              filename="photo-001.jpg"
              status="uploading"
              .progress=${0}
            ></upload-placeholder>
            <upload-placeholder
              filename="photo-002.jpg"
              status="uploading"
              .progress=${25}
            ></upload-placeholder>
            <upload-placeholder
              filename="photo-003.jpg"
              status="uploading"
              .progress=${50}
            ></upload-placeholder>
            <upload-placeholder
              filename="photo-004.jpg"
              status="uploading"
              .progress=${75}
            ></upload-placeholder>
            <upload-placeholder
              filename="photo-005.jpg"
              status="uploading"
              .progress=${100}
            ></upload-placeholder>
          </div>
        </div>

        <div class="section">
          <h2>Upload Placeholders - Processing</h2>
          <p class="description">
            Files that have finished uploading and are being processed by the backend.
          </p>
          <div class="placeholder-grid">
            <upload-placeholder
              filename="landscape-sunset.jpg"
              status="processing"
            ></upload-placeholder>
            <upload-placeholder
              filename="portrait-studio.jpg"
              status="processing"
            ></upload-placeholder>
            <upload-placeholder
              filename="architecture-modern.jpg"
              status="processing"
            ></upload-placeholder>
          </div>
        </div>

        <div class="section">
          <h2>Upload Placeholders - Complete</h2>
          <p class="description">Successfully uploaded and processed files.</p>
          <div class="placeholder-grid">
            <upload-placeholder
              filename="completed-photo-1.jpg"
              status="complete"
            ></upload-placeholder>
            <upload-placeholder
              filename="completed-photo-2.jpg"
              status="complete"
            ></upload-placeholder>
          </div>
        </div>

        <div class="section">
          <h2>Upload Placeholders - Error</h2>
          <p class="description">Failed uploads with error messages. Click to dismiss.</p>
          <div class="placeholder-grid">
            <upload-placeholder
              filename="too-large.jpg"
              status="error"
              error="File size exceeds 50MB limit"
            ></upload-placeholder>
            <upload-placeholder
              filename="corrupt-file.jpg"
              status="error"
              error="Unable to process image"
            ></upload-placeholder>
            <upload-placeholder
              filename="network-error.jpg"
              status="error"
              error="Network connection lost"
            ></upload-placeholder>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'funsies-page': FunsiesPage;
  }
}
