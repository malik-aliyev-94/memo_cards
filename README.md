# memo_cards

**Learn vocabulary faster using flashcards**

This is an Electron application based on the [Electron Quick Start Guide](https://github.com/electron/electron-quick-start).

A basic Electron application files:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.

## To Use

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/malik-aliyev-94/memo_cards
# Go into the repository
cd memo_cards
# Install dependencies
npm install
# Run the app
npm start
# Run the dist
npm dist
```

After running `npm dist` you can run **memo_cards.app** (on MacOS). This will also run nodejs server (:4200), you can open http://localhost:4200 on browser too. 


![Application](app/images/memo_cards.png)

Browser extensions for Chrome (chrome-ext) and Safari (VocaExt.safariextension) are also available. 
These extensions needed to easily add new words from translate.google.com

Once you have translated the word, you can click the extension button on toolbar and save the new word to your vocabulary. 



## License

[CC0 1.0 (Public Domain)](LICENSE.md)
