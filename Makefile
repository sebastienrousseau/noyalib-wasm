# SPDX-FileCopyrightText: 2026 Noyalib
# SPDX-License-Identifier: MIT OR Apache-2.0
#
# Developer tasks. `make` runs the same gates CI runs, in the same order
# a contributor should run them before pushing.

CARGO ?= cargo

.PHONY: all check clippy test fmt doc deny vet audit reuse spell clean

all: fmt check clippy test

check:
	$(CARGO) check --all-targets --all-features --locked

clippy:
	$(CARGO) clippy --all-targets --all-features --locked -- -D warnings

test:
	$(CARGO) test --all-features --locked

fmt:
	$(CARGO) fmt --all -- --check

doc:
	RUSTDOCFLAGS="-D warnings" $(CARGO) doc --no-deps --all-features --locked

deny:
	$(CARGO) deny check

vet:
	$(CARGO) vet --locked

audit:
	$(CARGO) audit

reuse:
	reuse lint

spell:
	codespell

clean:
	$(CARGO) clean
