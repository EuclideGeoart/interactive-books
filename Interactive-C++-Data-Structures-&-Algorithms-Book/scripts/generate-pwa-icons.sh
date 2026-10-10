#!/usr/bin/env sh
set -eu

convert -background none -density 216 public/icons/app-icon.svg -resize 192x192! -strip PNG32:public/icons/icon-192.png
convert -background none -density 576 public/icons/app-icon.svg -resize 512x512! -strip PNG32:public/icons/icon-512.png
convert -background none -density 576 public/icons/app-icon-maskable.svg -resize 512x512! -strip PNG32:public/icons/icon-maskable-512.png
