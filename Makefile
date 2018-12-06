PORT=3100
TEST_DRIVER=dispatch:mocha

lint:
	@./node_modules/.bin/eslint .

test-package:
	@meteor test-packages ./ --driver-package $(TEST_DRIVER) --once --port $(PORT)

test-app:
	@cd .example && npm test -- --port $(PORT) && cd -

test-app-watch:
	@cd .example && npm run test:watch -- --port $(PORT)

test-watch:
	@TEST_WATCH=1 meteor test-packages ./ --driver-package $(TEST_DRIVER) --port $(PORT)

.PHONY: test, test-watch
