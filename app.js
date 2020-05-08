const SteamUser = require('steam-user');
const SteamTotp = require('steam-totp');
const SteamCommunity = require('steamcommunity');
const TradeOfferManager = require('steam-tradeoffer-manager');

const config = require('./config.json');
const prices = require('./prices.json');

const client = new SteamUser();
const community = new SteamCommunity();
const manager = new TradeOfferManager({
  steam: client,
  community: community,
  language: 'en'
});

const logOnOptions = {
  accountName: config.username,
  password: config.password,
  // need sharedSecret from steam
  twoFactorCode: SteamTotp.generateAuthCode(config.sharedSecret)
};

client.logOn(logOnOptions);

// action after to login steam bot
client.on('loggedOn', () => {
  console.log('###########\n\n  LOGGED\n\n###########');
  client.setPersona(SteamUser.EPersonaState.Online);
  client.gamesPlayed(440);
});

client.on('webSession', (sessionid, cookies) => {
  // sessionid renove in each serverrun
  manager.setCookies(cookies);

  community.setCookies(cookies);
  community.startConfirmationChecker(20000, config.identitySecret);
});

function acceptOffer(offer) {
  offer.accept((e) => {
    community.checkConfirmations();
    if (e) {
      console.log('erro em accept');
      console.log(e);
    }
  })
}

function declineOffer(offer) {
  offer.decline((e) => {
    if (e) {
      console.log('erro em decline');
      console.log(e);
    }
  })
}

function processOffer(offer) {
  console.log('Offer = ')
  console.log(offer)
  if (offer.isGlitched() || offer.state === 11) {
    console.log('Offer was glitched, declining.');
  } else if (offer.partner.getSteamID64() === config.ownerID) {
    console.log('Auto accept the offer')
    acceptOffer(offer);
  } else {
    let ourItems = offer.itemsToGive;
    let theirItems = offer.itemsToReceive;
    let ourValue = 0;
    let theirValue = 0;

    for (var i in ourItems) {
      let item = ourItems[i].market_name;
      if (prices[item]) {
        ourValue += prices[item].sell;
      } else {
        console.log('Valor inválido');
        ourValue += 9999990009;
      }
    }

    for (var i in theirItems) {
      let item = theirItems[i].market_name;
      if (prices[item]) {
        theirValue += prices[item].buy;
      } else {
        console.log('Valores diferentes.');
      }
    }
    
    console.log('ourValue = ' + ourValue);
    console.log('theirValue = ' + theirValue);

    if (ourValue <= theirValue) {
      console.log('accept')
      acceptOffer(offer);
    } else {
      console.log('decline')
      declineOffer(offer);
    }
  }
}

client.setOption('promptSteamGuardCode', false);
manager.on('newOffer', (offer) => {
  processOffer(offer);
});
