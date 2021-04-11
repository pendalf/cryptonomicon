const API_KEY =
  "809f9bac2e6fd2bb9f5ce52996e4bade7525dbfa06844d0fbc01e3d722decc2d";

const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATED_INDEX = "5";

socket.addEventListener("message", e => {
  const {
    TYPE: type,
    FROMSYMBOL: validCurrency,
    PRICE: newPrice,
    PARAMETER: parameter,
    MESSAGE: message
  } = JSON.parse(e.data);
  let invalidCurrency;

  if (type === "500" && message === "INVALID_SUB") {
    invalidCurrency = parameter.replace(/^[^~]*~[^~]*~([^~]*).*$/, "$1");
  } else if (type !== AGGREGATED_INDEX || newPrice === undefined) {
    return;
  }
  const currency = validCurrency || invalidCurrency;
  console.log(currency);
  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => fn(newPrice));
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }
  socket.addEventListener("open", () => socket.send(stringifiedMessage), {
    once: true
  });
}

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

function unsubscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemoove",
    subs: [`5~CCCAGG~${ticker}~USD`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeToTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeToTickerOnWs(ticker);
};

window.tickers = tickersHandlers;
