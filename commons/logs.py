# -*- coding: utf-8 -*-

"""
Move here the logic for any log.

IMPORTANT: log level must be read as the very first possible thing...
"""

from __future__ import absolute_import

import os
import json
import logging

from logging.config import fileConfig
from json.decoder import JSONDecodeError

PROJECT_DIR = __package__
CONFIG_DIR = 'confs'
LOGGING_CONFIG_FILE = 'logging_config.ini'
LOG_CONFIG = os.path.join(PROJECT_DIR, CONFIG_DIR, LOGGING_CONFIG_FILE)
AVOID_COLORS_ENV_LABEL = 'TESTING_FLASK'

#######################
# DEBUG level is 10 (https://docs.python.org/3/howto/logging.html)
CRITICAL_EXIT = 60
VERBOSE = 5
VERY_VERBOSE = 1

MAX_CHAR_LEN = 200
OBSCURE_VALUE = '****'
OBSCURED_FIELDS = ['password', 'pwd', 'token', 'file', 'filename']


def critical_exit(self, message, *args, **kws):
    # Yes, logger takes its '*args' as 'args'.
    if self.isEnabledFor(CRITICAL_EXIT):
        self._log(CRITICAL_EXIT, message, args, **kws)

    # TO FIX: check if raise is better
    import sys
    sys.exit(1)


def verbose(self, message, *args, **kws):
    # Yes, logger takes its '*args' as 'args'.
    if self.isEnabledFor(VERBOSE):
        self._log(VERBOSE, message, args, **kws)


def very_verbose(self, message, *args, **kws):
    if self.isEnabledFor(VERY_VERBOSE):
        # Yes, logger takes its '*args' as 'args'.
        self._log(VERY_VERBOSE, message, args, **kws)


def pretty_print(self, myobject, prefix_line=None):
    """
    Make object(s) and structure(s) clearer to debug
    """

    if prefix_line is not None:
        print("PRETTY PRINT [%s]" % prefix_line)
    from beeprint import pp
    pp(myobject)
    return


logging.addLevelName(CRITICAL_EXIT, "CRITICAL_EXIT")
logging.Logger.critical_exit = critical_exit
logging.CRITICAL_EXIT = CRITICAL_EXIT

logging.addLevelName(VERBOSE, "VERBOSE")
logging.Logger.verbose = verbose
logging.VERBOSE = VERBOSE

logging.addLevelName(VERY_VERBOSE, "VERY_VERBOSE")
logging.Logger.very_verbose = very_verbose
logging.VERY_VERBOSE = VERY_VERBOSE

logging.Logger.pp = pretty_print


#######################
# read from os DEBUG_LEVEL (level of verbosity)
# configurated on a container level
USER_DEBUG_LEVEL = os.environ.get('DEBUG_LEVEL', 'VERY_VERBOSE')
VERBOSITY_REQUESTED = getattr(logging, USER_DEBUG_LEVEL)


################
# LOGGING internal class

class LogMe(object):
    """ A common logger to be used all around development packages """

    def __init__(self, debug=None):

        #####################
        self._log_level = None
        self._colors_enabled = True
        super(LogMe, self).__init__()

        #####################
        if AVOID_COLORS_ENV_LABEL in os.environ:
            self._colors_enabled = False

        #####################
        # Set default logging handler to avoid "No handler found" warnings.
        try:  # Python 2.7+
            from logging import NullHandler
        except ImportError:
            class NullHandler(logging.Handler):
                def emit(self, record):
                    pass

        #####################
        # Make sure there is at least one logger
        logging.getLogger(__name__).addHandler(NullHandler())
        # Format
        fileConfig(LOG_CONFIG)

        #####################
        # modify logging labels colors
        if self._colors_enabled:
            logging.addLevelName(
                logging.CRITICAL_EXIT, "\033[4;33;41m%s\033[1;0m"
                % logging.getLevelName(logging.CRITICAL_EXIT))
            logging.addLevelName(
                logging.CRITICAL, "\033[5;37;41m%s\033[1;0m"
                % logging.getLevelName(logging.CRITICAL))
            logging.addLevelName(
                logging.ERROR, "\033[4;37;41m%s\033[1;0m"
                % logging.getLevelName(logging.ERROR))
            logging.addLevelName(
                logging.WARNING, "\033[1;30;43m%s\033[1;0m"
                % logging.getLevelName(logging.WARNING))
            logging.addLevelName(
                logging.INFO, "\033[1;32m%s\033[1;0m"
                % logging.getLevelName(logging.INFO))
            logging.addLevelName(
                logging.DEBUG, "\033[7;30;46m%s\033[1;0m"
                % logging.getLevelName(logging.DEBUG))
            logging.addLevelName(
                logging.VERBOSE, "\033[7;30;47m%s\033[1;0m"
                % logging.getLevelName(logging.VERBOSE))
            logging.addLevelName(
                logging.VERY_VERBOSE, "\033[1;90m%s\033[1;0m"
                % logging.getLevelName(logging.VERY_VERBOSE))

    def set_debug(self, debug=True, level=None):
        # print("DEBUG IS", debug)
        # if debug is None:
        #     return

        self.debug = debug
        if self.debug:
            if level is not None:
                self._log_level = level
            else:
                self._log_level = logging.DEBUG
        else:
            self._log_level = logging.INFO

        return self._log_level

    def get_new_logger(self, name, verbosity=None):
        """ Recover the right logger + set a proper specific level """
        if self._colors_enabled:
            name = "\033[1;90m%s\033[1;0m" % name
        logger = logging.getLogger(name)

        if verbosity is not None:
            self.set_debug(True, verbosity)

        # print("LOGGER LEVEL", self._log_level, logging.INFO)
        logger.setLevel(self._log_level)
        return logger


def set_global_log_level(package=None, app_level=None):

    external_level = logging.WARNING
    if app_level is None:
        app_level = please_logme._log_level

    external_packages = [
        logging.getLogger('werkzeug'),
        logging.getLogger('plumbum'),
        logging.getLogger('neo4j'),
        logging.getLogger('neomodel'),
        logging.getLogger('httpstream'),
        logging.getLogger('amqp')
    ]

    for logger in external_packages:
        logger.setLevel(external_level)

    for handler in logging.getLogger().handlers:
        handler.setLevel(app_level)

    logging.getLogger().setLevel(app_level)

    for key, value in logging.Logger.manager.loggerDict.items():

        if not isinstance(value, logging.Logger):
            # print("placeholder", key, value)
            continue

        if package is not None and package + '.' in key:
            # print("current", key, value.level)
            value.setLevel(app_level)
        elif __package__ + '.' in key:
            # print("common", key)
            value.setLevel(app_level)
        else:
            value.setLevel(external_level)


please_logme = LogMe()
# log = please_logme.get_new_logger(__name__)


def get_logger(name, debug_setter=None, newlevel=None):
    """ Recover the right logger + set a proper specific level """

    # if debug_setter is not None:
    #     please_logme.set_debug(debug_setter, level=newlevel)

    return please_logme.get_new_logger(name, verbosity=VERBOSITY_REQUESTED)


# def silence_loggers():
# # UNSUSED
#     root_logger = logging.getLogger()
#     first = True
#     for handler in root_logger.handlers:
#         if first:
#             first = False
#             continue
#         root_logger.removeHandler(handler)
#         # handler.close()


def handle_log_output(original_parameters_string):

    """ Avoid printing passwords! """
    if (original_parameters_string is None):
        return {}

    mystr = original_parameters_string.decode("utf-8")
    if mystr.strip() == '':
        return {}

    try:
        parameters = json.loads(mystr)
    except JSONDecodeError:
        return original_parameters_string

    # # PEP 274 -- Dict Comprehensions (Python 3)
    # # and clarification on conditionals:
    # # http://stackoverflow.com/a/9442777/2114395
    # return {
    #     key: (OBSCURE_VALUE if key in OBSCURED_FIELDS else value)
    #     for key, value in parameters.items()
    # }
    #

    output = {}
    for key, value in parameters.items():
        if key in OBSCURED_FIELDS:
            value = OBSCURE_VALUE
        elif not isinstance(value, str):
            continue
        else:
            try:
                if len(value) > MAX_CHAR_LEN:
                    value = value[:MAX_CHAR_LEN] + "..."
            except IndexError:
                pass
        output[key] = value

    return output
