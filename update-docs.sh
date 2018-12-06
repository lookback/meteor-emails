#!/usr/bin/env bash

git stash && \
git checkout -b gh-pages && \
rm -rf .example && \
docco lib/*.js && \
git add docs && \
git commit -a -m 'Generate documentation' && \
git push -f origin gh-pages && \
git checkout master && \
git branch -D gh-pages && \
git stash pop && \
echo "Done: Generated documentation"
