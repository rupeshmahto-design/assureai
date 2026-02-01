#!/bin/bash

# Start backend
cd backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ..
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
