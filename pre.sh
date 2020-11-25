#! /bin/bash
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install build-essential && sudo snap install shellcheck
npm install wechaty@next
npm install qrcode-terminal
