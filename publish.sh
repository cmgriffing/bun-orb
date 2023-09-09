#!/bin/bash

echo "Packing orb"
circleci orb pack ./src > orb.yml
echo "Publishing orb"
circleci orb publish ./orb.yml cmgriffing/bun-orb@dev:first
echo "Promoting orb"
circleci orb publish promote cmgriffing/bun-orb@dev:first patch