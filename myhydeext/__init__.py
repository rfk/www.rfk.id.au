
from jinja2 import environmentfilter

import hyde.ext.templates.jinja
from hyde.ext.templates.jinja import Syntax, Expando
from hyde.ext.plugins.less import LessCSSPlugin

import pygments
from pygments import lexers
from pygments.formatters import HtmlFormatter


class WorkingLessCSSPlugin(LessCSSPlugin):
    def begin_text_resource(self, resource, text):
        res = LessCSSPlugin.begin_text_resource(self,resource,text)
        if res is None:
            res = text
        return res


class RawHtmlFormatter(HtmlFormatter):
    def wrap(self, source, outfile):
        return source


@environmentfilter
def rawsyntax(env, value, lexer=None, filename=None):

    pyg = (lexers.get_lexer_by_name(lexer)
                if lexer else
                    lexers.guess_lexer(value))
    settings = {}
    if hasattr(env.config, 'syntax'):
        settings = getattr(env.config.syntax,
                            'options',
                            Expando({})).to_dict()
    formatter = RawHtmlFormatter(**settings)
    return pygments.highlight(value, pyg, formatter)
    

class RawSyntax(Syntax):
    def _render_syntax(self, lex, filename, caller=None):
        """
        Calls the syntax filter to transform the output.
        """
        if not caller:
            return ''
        output = caller().strip()
        return rawsyntax(self.environment, output, lex, filename)
 
hyde.ext.templates.jinja.Syntax = RawSyntax

