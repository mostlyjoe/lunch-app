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
            </p></main>
    );
}
