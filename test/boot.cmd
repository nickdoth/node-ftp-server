@echo off
call el nodejs

set DEBUG=*
:loop

call node test

goto loop