#!/bin/bash
# Run this script after any file change to deploy to Vercel
npx vercel --prod "$@"
