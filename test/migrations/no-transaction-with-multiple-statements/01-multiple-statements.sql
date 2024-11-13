-- @sfm-no-transaction
create table foo(bar text, baz text);
create index concurrently on foo(bar);
create index concurrently on foo(baz);
