#!/bin/bash

# Start Backend Server

echo "Starting MongoDB..."
brew services start mongodb/brew/mongodb-community

echo "Waiting for MongoDB to start..."
sleep 3

echo "Starting Backend Server..."
cd "$(dirname "$0")"
python server.py
