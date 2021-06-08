'use strict';

let currentLanguageTable = null;

function lookupString(token) {
  if (currentLanguageTable === null || !(token in currentLanguageTable)) {
    return `!!! ${token} !!!`;
  }

  return currentLanguageTable[token];
}

async function setCurrentLanguage(langId) {
  return fetch(`translations/${langId}.json`)
    .then(res => res.json())
    .then(db => {
      currentLanguageTable = db;
    });
}

async function init() {
  if (localStorage !== null) {
    const langId = localStorage.getItem('currentLanguageId');
    if (langId !== null) {
      return setCurrentLanguage(langId);
    } else {
      localStorage.setItem('currentLanguageId', 'en_US');
      return setCurrentLanguage('en_US');
    }
  } else {
    return setCurrentLanguage('en_US');
  }
}

export default {
  init,
  lookupString,
  setCurrentLanguage,
};
