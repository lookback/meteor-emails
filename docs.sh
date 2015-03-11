#!/usr/bin/env bash

git checkout -b gh-pages && \
git rebase master && \
docco emails.coffee utils.coffee -o . && \
git add . && \
git commit -a -m 'Generate documentation' && \
git push -f origin gh-pages && \
git checkout master && \
echo "Done: Generated documentation"
