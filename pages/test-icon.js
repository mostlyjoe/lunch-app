import { ShoppingBagIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";

export default function TestIconPage() {
    return (
        <main className="test-page">
            <h1>🧪 Heroicons Test</h1>
            <p>If these icons appear, your setup is correct:</p>

            <div className="icon-grid">
                <div className="icon-block">
                    <Bars3Icon className="test-icon red" />
                    <span>Bars3Icon</span>
                </div>

                <div className="icon-block">
                    <XMarkIcon className="test-icon red" />
                    <span>XMarkIcon</span>
                </div>

                <div className="icon-block">
                    <ShoppingBagIcon className="test-icon red" />
                    <span>ShoppingBagIcon</span>
                </div>
            </div>

            <p>
                If you don’t see icons above (just blank space), run:<br />
                <code>npm install @heroicons/react</code> and restart your dev server.
            </p>

            <style jsx>{`
        .test-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          background: #fffde7;
          color: #b71c1c;
          font-family: sans-serif;
          padding: 2rem;
        }
        h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 0;
        }
        .icon-grid {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .icon-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .test-icon {
          width: 48px;
          height: 48px;
          color: #b71c1c;
          fill: currentColor;
          stroke: currentColor;
        }
        .test-icon.red {
          color: #b71c1c;
        }
        code {
          background: #fff9c4;
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
        }
      `}</style>
        </main>
    );
}
