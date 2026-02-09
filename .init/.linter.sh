#!/bin/bash
cd /home/kavia/workspace/code-generation/simple-to-do-list-317631-317645/frontend_react_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

