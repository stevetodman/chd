#!/bin/sh
# shellcheck shell=sh

if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init

  command_exists() {
    command -v "$1" >/dev/null 2>&1
  }

  if command_exists dirname; then
    :
  fi

  unset husky_skip_init
fi
