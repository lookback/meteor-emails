PORT=3100
TEST_DRIVER=dispatch:mocha

test:
	@meteor test-packages ./ --driver-package $(TEST_DRIVER) --once

test-watch:
	@TEST_WATCH=1 meteor test-packages ./ --driver-package $(TEST_DRIVER) --port $(PORT)

.PHONY: test, test-watch
