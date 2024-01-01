const express = require('express');
const jsonParser = express.json({ limit: '100mb' });
/**
 * Initialize plugin.
 * @param {import('express').Router} router Express router
 * @returns {Promise<any>} Promise that resolves when plugin is initialized
 */

async function init(router) {
    require('./client_use').registerEndpoints(router, jsonParser);
    console.log('---------------------------------------------');
    console.log('Poe plugin loaded!========');
    console.log('---------------------------------------------');
    console.log('PoePluging hosted on http://127.0.0.1:8000/api/plugins/poe_plugin/v1');
    console.log('---------------------------------------------');
    return Promise.resolve();
}

async function exit() {
    return Promise.resolve();
}

module.exports = {
    init,
    exit,
    info: {
        id: 'poe_plugin',
        name: 'poe_plugin',
        description: 'poe_plugin',
    },
};
