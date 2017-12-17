let config= require('./config.json');

const Cryptopia = require('./cryptopia');
const cryptopia = new Cryptopia(config.cryptopia.key, config.cryptopia.secret);

run();
// check in an interval
setInterval(() =>{
    run();
}, config.intervalSeconds * 1000);

async function run() {
    // cancel all previous orders
    await cancelOrders();

    // sell sell the shitcoins
    for(let i = 0; i < config.shitcoins.length; i++){
        await sellShitcoin(config.shitcoins[i]);
    }

    // Buy the coin cashing out with
    await buyCashOutCoin();

    // Make the withdrawal
    await cashOut();
}

async function cancelOrders() {

    const openOrders = await cryptopia.GetOpenOrders();
    console.log('openOrders', openOrders);

}

async function sellShitcoin(coin) {
    const balances = await cryptopia.GetBalance();
    let gobyteBalances = null;
    // console.log(JSON.stringify(balances, null, 4));
    for (let i = 0; i < balances.Data.length; i++) {
        if (balances.Data[i].Symbol === coin) {
            gobyteBalances = balances.Data[i];
            break;
        }
    }
    console.log(coin, gobyteBalances);
    if (gobyteBalances.Available > config.minShitcoinSell) {
        let amountLeft = gobyteBalances.Available;
        let tradeCount = 0;

        const orderBook = await cryptopia.GetMarketOrders(coin+'_BTC', 50);
        console.log(JSON.stringify(orderBook, null, 4));
        while (amountLeft > 0) {

            // determine amount to trade
            let thisTradeAmount;
            if (orderBook.Data['Buy'][tradeCount].Volume > amountLeft) {
                thisTradeAmount = amountLeft;
            } else {
                thisTradeAmount = orderBook.Data['Buy'][tradeCount].Volume;
            }
            console.log(`Trading ${thisTradeAmount} ${coin} for ${orderBook.Data['Buy'][tradeCount].Total} BTC`);
            // make trade


            const thisTrade = await cryptopia.SubmitTrade(coin+'_BTC', null, 'Sell', orderBook.Data['Buy'][tradeCount].Price, thisTradeAmount);
            console.log('thisTrade', thisTrade);

            amountLeft = parseFloat((amountLeft - thisTradeAmount).toFixed(8));
            tradeCount++;
        }
    }
}

async function buyCashOutCoin() {
    const balances = await (cryptopia.GetBalance());
    let btcBalance = null;
    // console.log(JSON.stringify(balances, null, 4));
    for (let i = 0; i < balances.Data.length; i++) {
        if (balances.Data[i].Symbol === 'BTC') {
            btcBalance = balances.Data[i];
            break;
        }
    }
    console.log('BTC', btcBalance);
    if (btcBalance.Available > config.minCashOutCoinBuy) {
        let amountLeft = btcBalance.Available;
        let tradeCount = 0;
        let addTrade = 0;

        const orderBook = await cryptopia.GetMarketOrders(config.cashOutCoin+'_BTC', 50);
        // console.log(JSON.stringify(orderBook, null, 4));
        while (amountLeft > 0) {

            // determine amount to trade
            let thisTradeAmount;
            const buyAmount = amountLeft / orderBook.Data['Sell'][tradeCount].Price;
            if (orderBook.Data['Sell'][tradeCount].Volume > buyAmount) {
                thisTradeAmount = buyAmount;
            } else {
                thisTradeAmount = orderBook.Data['Sell'][tradeCount].Volume;
            }

            thisTradeAmount = round(thisTradeAmount) - 0.00000001;
            console.log(`Trading ${thisTradeAmount} BTC for ${orderBook.Data['Sell'][tradeCount].Total} ${config.cashOutCoin}`);
            // make trade

            const thisTrade = await cryptopia.SubmitTrade(config.cashOutCoin+'_BTC', null, 'Buy', orderBook.Data['Sell'][tradeCount].Price, thisTradeAmount);
            console.log("orderBook.Data['Sell'][tradeCount]", orderBook.Data['Sell'][tradeCount]);
            console.log('thisTrade', thisTrade);
            console.log('thisTradeAmount', thisTradeAmount);

            amountLeft = parseFloat((amountLeft - (thisTradeAmount * orderBook.Data['Sell'][tradeCount].Price)).toFixed(8));
            tradeCount++;
        }
    }
}

async function cashOut(){
    const balances = await (cryptopia.GetBalance());
    let balance = null;
    // console.log(JSON.stringify(balances, null, 4));
    for (let i = 0; i < balances.Data.length; i++) {
        if (balances.Data[i].Symbol === config.cashOutCoin) {
            balance = balances.Data[i];
            break;
        }
    }
    console.log(config.cashOutCoin, balance);
    if(balance.Available > config.minCashout){
        console.log(`Cashing out ${balance.Available} ${config.cashOutCoin}`);
        const thisCashout = await cryptopia.SubmitWithdraw(config.cashOutCoin, config.cashOutAddress, null, balance.Available);
        console.log('thisCashout', thisCashout)
    }
}

function round(num){
    return parseFloat((num).toFixed(8));
}
