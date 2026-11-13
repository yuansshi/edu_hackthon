PYTHON ?= python3

.PHONY: check app-check app-test app-probe
check:
	$(PYTHON) .agents/scripts/check_setup.py

app-check:
	npm run check

app-test:
	npm test

app-probe:
	npm run probe:audio
