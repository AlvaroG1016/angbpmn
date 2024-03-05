import { snippetCompletion, autocompletion as autocompletion$1, completeFromList, closeBrackets } from '@codemirror/autocomplete';
import { defaultKeymap } from '@codemirror/commands';
import { syntaxTree, LanguageSupport, syntaxHighlighting, HighlightStyle, bracketMatching, indentOnInput } from '@codemirror/language';
import { linter as linter$1, setDiagnosticsEffect } from '@codemirror/lint';
import { Facet, Compartment, EditorState } from '@codemirror/state';
import { EditorView, tooltips, keymap } from '@codemirror/view';
import { snippets, keywordCompletions, feelLanguage } from 'lang-feel';
import { domify } from 'min-dom';
import { cmFeelLinter } from '@bpmn-io/feel-lint';
import { tags as tags$1 } from '@lezer/highlight';

// helpers ///////////////////////////////

function isNodeEmpty(node) {
  return node.from === node.to;
}

function isPathExpression(node) {
  if (!node) {
    return false;
  }

  if (node.name === 'PathExpression') {
    return true;
  }

  return isPathExpression(node.parent);
}

var tags = [
	{
		name: "not(negand)",
		description: "<p>Returns the logical negation of the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">not(negand: boolean): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">not(true)\n// false\n\nnot(null)\n// null\n</code></pre>\n"
	},
	{
		name: "is defined(value)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Checks if a given value is not <code>null</code>. If the value is <code>null</code> then the function returns <code>false</code>.\nOtherwise, the function returns <code>true</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">is defined(value: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">is defined(1)\n// true\n\nis defined(null)\n// false\n\nis defined(x)\n// false - if no variable &quot;x&quot; exists\n\nis defined(x.y)\n// false - if no variable &quot;x&quot; exists or it doesn&#39;t have a property &quot;y&quot;\n</code></pre>\n<p>:::caution Breaking change</p>\n<p>This function worked differently in previous versions. It returned <code>true</code> if the value was <code>null</code>.\nSince this version, the function returns <code>false</code> if the value is <code>null</code>.</p>\n<p>:::</p>\n"
	},
	{
		name: "get or else(value, default)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Return the provided value parameter if not <code>null</code>, otherwise return the default parameter</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">get or else(value: Any, default: Any): Any\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">get or else(&quot;this&quot;, &quot;default&quot;)\n// &quot;this&quot;\n\nget or else(null, &quot;default&quot;)\n// &quot;default&quot;\n\nget or else(null, null)\n// null\n</code></pre>\n"
	},
	{
		name: "assert(value, condition)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Verify that the given condition is met. If the condition is <code>true</code>, the function returns the value.\nOtherwise, the evaluation fails with an error.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">assert(value: Any, condition: Any)\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">assert(x, x != null)\n// &quot;value&quot; - if x is &quot;value&quot;\n// error - if x is null or doesn&#39;t exist\n\nassert(x, x &gt;= 0)\n// 4 - if x is 4\n// error - if x is less than zero\n</code></pre>\n"
	},
	{
		name: "assert(value, condition, cause)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Verify that the given condition is met. If the condition is <code>true</code>, the function returns the value.\nOtherwise, the evaluation fails with an error containing the given message.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">assert(value: Any, condition: Any, cause: String)\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">assert(x, x != null, &quot;&#39;x&#39; should not be null&quot;)\n// &quot;value&quot; - if x is &quot;value&quot;\n// error(&#39;x&#39; should not be null) - if x is null or doesn&#39;t exist\n\nassert(x, x &gt;= 0, &quot;&#39;x&#39; should be positive&quot;)\n// 4 - if x is 4\n// error(&#39;x&#39; should be positive) - if x is less than zero\n</code></pre>\n"
	},
	{
		name: "get value(context, key)",
		description: "<p>Returns the value of the context entry with the given key.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">get value(context: context, key: string): Any\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">get value({foo: 123}, &quot;foo&quot;)\n// 123\n\nget value({a: 1}, &quot;b&quot;)\n// null\n</code></pre>\n"
	},
	{
		name: "get value(context, keys)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Returns the value of the context entry for a context path defined by the given keys.</p>\n<p>If <code>keys</code> contains the keys <code>[k1, k2]</code> then it returns the value at the nested entry <code>k1.k2</code> of the context.</p>\n<p>If <code>keys</code> are empty or the nested entry defined by the keys doesn&#39;t exist in the context, it returns <code>null</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">get value(context: context, keys: list&lt;string&gt;): Any\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">get value({x:1, y: {z:0}}, [&quot;y&quot;, &quot;z&quot;])\n// 0\n\nget value({x: {y: {z:0}}}, [&quot;x&quot;, &quot;y&quot;])\n// {z:0}\n\nget value({a: {b: 3}}, [&quot;b&quot;])\n// null\n</code></pre>\n"
	},
	{
		name: "get entries(context)",
		description: "<p>Returns the entries of the context as a list of key-value-pairs.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">get entries(context: context): list&lt;context&gt;\n</code></pre>\n<p>The return value is a list of contexts. Each context contains two entries for &quot;key&quot; and &quot;value&quot;.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">get entries({foo: 123})\n// [{key: &quot;foo&quot;, value: 123}]\n</code></pre>\n"
	},
	{
		name: "context put(context, key, value)",
		description: "<p>Adds a new entry with the given key and value to the context. Returns a new context that includes the entry.</p>\n<p>If an entry for the same key already exists in the context, it overrides the value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">context put(context: context, key: string, value: Any): context\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">context put({x:1}, &quot;y&quot;, 2)\n// {x:1, y:2}\n</code></pre>\n<p>:::info\nThe function <code>context put()</code> replaced the previous function <code>put()</code> (Camunda Extension). The\nprevious function is deprecated and should not be used anymore.\n:::</p>\n"
	},
	{
		name: "context put(context, keys, value)",
		description: "<p>Adds a new entry with the given value to the context. The path of the entry is defined by the keys. Returns a new context that includes the entry.</p>\n<p>If <code>keys</code> contains the keys <code>[k1, k2]</code> then it adds the nested entry <code>k1.k2 = value</code> to the context.</p>\n<p>If an entry for the same keys already exists in the context, it overrides the value.</p>\n<p>If <code>keys</code> are empty, it returns <code>null</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">context put(context: context, keys: list&lt;string&gt;, value: Any): context\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">context put({x:1}, [&quot;y&quot;], 2)\n// {x:1, y:2}\n\ncontext put({x:1, y: {z:0}}, [&quot;y&quot;, &quot;z&quot;], 2)\n// {x:1, y: {z:2}}\n\ncontext put({x:1}, [&quot;y&quot;, &quot;z&quot;], 2)\n// {x:1, y: {z:2}}\n</code></pre>\n"
	},
	{
		name: "context merge(contexts)",
		description: "<p>Union the given contexts. Returns a new context that includes all entries of the given contexts.</p>\n<p>If an entry for the same key already exists in a context, it overrides the value. The entries are overridden in the same order as in the list of contexts.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">context merge(contexts: list&lt;context&gt;): context\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">context merge([{x:1}, {y:2}])\n// {x:1, y:2}\n\ncontext merge([{x:1, y: 0}, {y:2}])\n// {x:1, y:2}\n</code></pre>\n<p>:::info\nThe function <code>context merge()</code> replaced the previous function <code>put all()</code> (Camunda Extension). The\nprevious function is deprecated and should not be used anymore.\n:::</p>\n"
	},
	{
		name: "string(from)",
		description: "<p>Returns the given value as a string representation.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">string(from: Any): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">string(1.1)\n// &quot;1.1&quot;\n\nstring(date(&quot;2012-12-25&quot;))\n// &quot;2012-12-25&quot;\n</code></pre>\n"
	},
	{
		name: "number(from)",
		description: "<p>Parses the given string to a number.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">number(from: string): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">number(&quot;1500.5&quot;)\n// 1500.5\n</code></pre>\n"
	},
	{
		name: "context(entries)",
		description: "<p>Constructs a context of the given list of key-value pairs. It is the reverse function to <a href=\"feel-built-in-functions-context.md#get-entriescontext\">get entries()</a>.</p>\n<p>Each key-value pair must be a context with two entries: <code>key</code> and <code>value</code>. The entry with name <code>key</code> must have a value of the type <code>string</code>.</p>\n<p>It might override context entries if the keys are equal. The entries are overridden in the same order as the contexts in the given list.</p>\n<p>Returns <code>null</code> if one of the entries is not a context or if a context doesn&#39;t contain the required entries.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">context(entries: list&lt;context&gt;): context\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">context([{&quot;key&quot;:&quot;a&quot;, &quot;value&quot;:1}, {&quot;key&quot;:&quot;b&quot;, &quot;value&quot;:2}])\n// {a:1, b:2}\n</code></pre>\n"
	},
	{
		name: "date(from)",
		description: "<p>Returns a date from the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">date(from: string): date\n</code></pre>\n<p>Parses the given string into a date.</p>\n<pre><code class=\"language-feel\">date(from: date and time): date\n</code></pre>\n<p>Extracts the date component from the given date and time.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">date(&quot;2018-04-29&quot;)\n// date(&quot;2018-04-29&quot;)\n\ndate(date and time(&quot;2012-12-25T11:00:00&quot;))\n// date(&quot;2012-12-25&quot;)\n</code></pre>\n"
	},
	{
		name: "date(year, month, day)",
		description: "<p>Returns a date from the given components.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">date(year: number, month: number, day: number): date\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">date(2012, 12, 25)\n// date(&quot;2012-12-25&quot;)\n</code></pre>\n"
	},
	{
		name: "time(from)",
		description: "<p>Returns a time from the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">time(from: string): time\n</code></pre>\n<p>Parses the given string into a time.</p>\n<pre><code class=\"language-feel\">time(from: date and time): time\n</code></pre>\n<p>Extracts the time component from the given date and time.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">time(&quot;12:00:00&quot;)\n// time(&quot;12:00:00&quot;)\n\ntime(date and time(&quot;2012-12-25T11:00:00&quot;))\n// time(&quot;11:00:00&quot;)\n</code></pre>\n"
	},
	{
		name: "time(hour, minute, second)",
		description: "<p>Returns a time from the given components.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">time(hour: number, minute: number, second: number): time\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">time(23, 59, 0)\n// time(&quot;23:59:00&quot;)\n</code></pre>\n"
	},
	{
		name: "time(hour, minute, second, offset)",
		description: "<p>Returns a time from the given components, including a timezone offset.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">time(hour: number, minute: number, second: number, offset: days and time duration): time\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">time(14, 30, 0, duration(&quot;PT1H&quot;))\n// time(&quot;14:30:00+01:00&quot;)\n</code></pre>\n"
	},
	{
		name: "date and time(from)",
		description: "<p>Parses the given string into a date and time.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">date and time(from: string): date and time\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">date and time(&quot;2018-04-29T009:30:00&quot;)\n// date and time(&quot;2018-04-29T009:30:00&quot;)\n</code></pre>\n"
	},
	{
		name: "date and time(date, time)",
		description: "<p>Returns a date and time from the given components.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">date and time(date: date, time: time): date and time\n</code></pre>\n<pre><code class=\"language-feel\">date and time(date: date and time, time: time): date and time\n</code></pre>\n<p>Returns a date and time value that consists of the date component of <code>date</code> combined with <code>time</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">date and time(date(&quot;2012-12-24&quot;),time(&quot;T23:59:00&quot;))\n// date and time(&quot;2012-12-24T23:59:00&quot;)\n\ndate and time(date and time(&quot;2012-12-25T11:00:00&quot;),time(&quot;T23:59:00&quot;))\n// date and time(&quot;2012-12-25T23:59:00&quot;)\n</code></pre>\n"
	},
	{
		name: "date and time(date, timezone)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Returns the given date and time value at the given timezone.</p>\n<p>If <code>date</code> has a different timezone than <code>timezone</code> then it adjusts the time to match the local time of <code>timezone</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">date and time(date: date and time, timezone: string): date and time\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">date and time(@&quot;2020-07-31T14:27:30@Europe/Berlin&quot;, &quot;America/Los_Angeles&quot;)\n// date and time(&quot;2020-07-31T05:27:30@America/Los_Angeles&quot;)\n\ndate and time(@&quot;2020-07-31T14:27:30&quot;, &quot;Z&quot;)\n// date and time(&quot;2020-07-31T12:27:30Z&quot;)\n</code></pre>\n"
	},
	{
		name: "duration(from)",
		description: "<p>Parses the given string into a duration. The duration is either a days and time duration or a years and months duration.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">duration(from: string): days and time duration\n</code></pre>\n<pre><code class=\"language-feel\">duration(from: string): years and months duration\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">duration(&quot;P5D&quot;)\n// duration(&quot;P5D&quot;)\n\nduration(&quot;P32Y&quot;)\n// duration(&quot;P32Y&quot;)\n</code></pre>\n"
	},
	{
		name: "years and months duration(from, to)",
		description: "<p>Returns the years and months duration between <code>from</code> and <code>to</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">years and months duration(from: date, to: date): years and months duration\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">years and months duration(date(&quot;2011-12-22&quot;), date(&quot;2013-08-24&quot;))\n// duration(&quot;P1Y8M&quot;)\n</code></pre>\n"
	},
	{
		name: "list contains(list, element)",
		description: "<p>Returns <code>true</code> if the given list contains the element. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">list contains(list: list, element: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">list contains([1,2,3], 2)\n// true\n</code></pre>\n"
	},
	{
		name: "count(list)",
		description: "<p>Returns the number of elements of the given list.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">count(list: list): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">count([1,2,3])\n// 3\n</code></pre>\n"
	},
	{
		name: "min(list)",
		description: "<p>Returns the minimum of the given list.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">min(list: list): Any\n</code></pre>\n<p>All elements in <code>list</code> should have the same type and be comparable.</p>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">min([1,2,3])\n// 1\n\nmin(1,2,3)\n// 1\n</code></pre>\n"
	},
	{
		name: "max(list)",
		description: "<p>Returns the maximum of the given list.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">max(list: list): Any\n</code></pre>\n<p>All elements in <code>list</code> should have the same type and be comparable.</p>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">max([1,2,3])\n// 3\n\nmax(1,2,3)\n// 3\n</code></pre>\n"
	},
	{
		name: "sum(list)",
		description: "<p>Returns the sum of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">sum(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">sum([1,2,3])\n// 6\n\nsum(1,2,3)\n// 6\n</code></pre>\n"
	},
	{
		name: "product(list)",
		description: "<p>Returns the product of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">product(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">product([2, 3, 4])\n// 24\n\nproduct(2, 3, 4)\n// 24\n</code></pre>\n"
	},
	{
		name: "mean(list)",
		description: "<p>Returns the arithmetic mean (i.e. average) of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">mean(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">mean([1,2,3])\n// 2\n\nmean(1,2,3)\n// 2\n</code></pre>\n"
	},
	{
		name: "median(list)",
		description: "<p>Returns the median element of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">median(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">median(8, 2, 5, 3, 4)\n// 4\n\nmedian([6, 1, 2, 3])\n// 2.5\n</code></pre>\n"
	},
	{
		name: "stddev(list)",
		description: "<p>Returns the standard deviation of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">stddev(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">stddev(2, 4, 7, 5)\n// 2.0816659994661326\n\nstddev([2, 4, 7, 5])\n// 2.0816659994661326\n</code></pre>\n"
	},
	{
		name: "mode(list)",
		description: "<p>Returns the mode of the given list of numbers.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">mode(list: list&lt;number&gt;): number\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">mode(6, 3, 9, 6, 6)\n// [6]\n\nmode([6, 1, 9, 6, 1])\n// [1, 6]\n</code></pre>\n"
	},
	{
		name: "all(list)",
		description: "<p>Returns <code>false</code> if any element of the given list is <code>false</code>. Otherwise, returns <code>true</code>.</p>\n<p>If the given list is empty, it returns <code>true</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">all(list: list&lt;boolean&gt;): boolean\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">all([true,false])\n// false\n\nall(false,null,true)\n// false\n</code></pre>\n<p>:::info\nThe function <code>all()</code> replaced the previous function <code>and()</code>. The previous function is deprecated and\nshould not be used anymore.\n:::</p>\n"
	},
	{
		name: "any(list)",
		description: "<p>Returns <code>true</code> if any element of the given list is <code>true</code>. Otherwise, returns <code>false</code>.</p>\n<p>If the given list is empty, it returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">any(list: list&lt;boolean&gt;): boolean\n</code></pre>\n<p>The parameter <code>list</code> can be passed as a list or as a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">any([false,true])\n// true\n\nany(false,null,true)\n// true\n</code></pre>\n<p>:::info\nThe function <code>any()</code> replaced the previous function <code>or()</code>. The previous function is deprecated and\nshould not be used anymore.\n:::</p>\n"
	},
	{
		name: "sublist(list, start position)",
		description: "<p>Returns a partial list of the given value starting at <code>start position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">sublist(list: list, start position: number): list\n</code></pre>\n<p>The <code>start position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">sublist([1,2,3], 2)\n// [2,3]\n</code></pre>\n"
	},
	{
		name: "sublist(list, start position, length)",
		description: "<p>Returns a partial list of the given value starting at <code>start position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">sublist(list: list, start position: number, length: number): list\n</code></pre>\n<p>The <code>start position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">sublist([1,2,3], 1, 2)\n// [1,2]\n</code></pre>\n"
	},
	{
		name: "append(list, items)",
		description: "<p>Returns the given list with all <code>items</code> appended.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">append(list: list, items: Any): list\n</code></pre>\n<p>The parameter <code>items</code> can be a single element or a sequence of elements.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">append([1], 2, 3)\n// [1,2,3]\n</code></pre>\n"
	},
	{
		name: "concatenate(lists)",
		description: "<p>Returns a list that includes all elements of the given lists.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">concatenate(lists: list): list\n</code></pre>\n<p>The parameter <code>lists</code> is a sequence of lists.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">concatenate([1,2],[3])\n// [1,2,3]\n\nconcatenate([1],[2],[3])\n// [1,2,3]\n</code></pre>\n"
	},
	{
		name: "insert before(list, position, newItem)",
		description: "<p>Returns the given list with <code>newItem</code> inserted at <code>position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">insert before(list: list, position: number, newItem: Any): list\n</code></pre>\n<p>The <code>position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">insert before([1,3],1,2)\n// [2,1,3]\n</code></pre>\n"
	},
	{
		name: "remove(list, position)",
		description: "<p>Returns the given list without the element at <code>position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">remove(list: list, position: number): list\n</code></pre>\n<p>The <code>position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">remove([1,2,3], 2)\n// [1,3]\n</code></pre>\n"
	},
	{
		name: "reverse(list)",
		description: "<p>Returns the given list in revered order.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">reverse(list: list): list\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">reverse([1,2,3])\n// [3,2,1]\n</code></pre>\n"
	},
	{
		name: "index of(list, match)",
		description: "<p>Returns an ascending list of positions containing <code>match</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">index of(list: list, match: Any): list&lt;number&gt;\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">index of([1,2,3,2],2)\n// [2,4]\n</code></pre>\n"
	},
	{
		name: "union(list)",
		description: "<p>Returns a list that includes all elements of the given lists without duplicates.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">union(list: list): list\n</code></pre>\n<p>The parameter <code>list</code> is a sequence of lists.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">union([1,2],[2,3])\n// [1,2,3]\n</code></pre>\n"
	},
	{
		name: "distinct values(list)",
		description: "<p>Returns the given list without duplicates.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">distinct values(list: list): list\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">distinct values([1,2,3,2,1])\n// [1,2,3]\n</code></pre>\n"
	},
	{
		name: "duplicate values(list)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Returns all duplicate values of the given list.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">duplicate values(list: list): list\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">duplicate values([1,2,3,2,1])\n// [1,2]\n</code></pre>\n"
	},
	{
		name: "flatten(list)",
		description: "<p>Returns a list that includes all elements of the given list without nested lists.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">flatten(list: list): list\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">flatten([[1,2],[[3]], 4])\n// [1,2,3,4]\n</code></pre>\n"
	},
	{
		name: "sort(list, precedes)",
		description: "<p>Returns the given list sorted by the <code>precedes</code> function.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">sort(list: list, precedes: function&lt;(Any, Any) -&gt; boolean&gt;): list\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">sort(list: [3,1,4,5,2], precedes: function(x,y) x &lt; y)\n// [1,2,3,4,5]\n</code></pre>\n"
	},
	{
		name: "string join(list)",
		description: "<p>Joins a list of strings into a single string. This is similar to\nJava&#39;s <a href=\"https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Collectors.html#joining(java.lang.CharSequence,java.lang.CharSequence,java.lang.CharSequence)\">joining</a>\nfunction.</p>\n<p>If an item of the list is <code>null</code>, the item is ignored for the result string. If an item is\nneither a string nor <code>null</code>, the function returns <code>null</code> instead of a string.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">string join(list: list&lt;string&gt;): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">string join([&quot;a&quot;,&quot;b&quot;,&quot;c&quot;])\n// &quot;abc&quot;\n\nstring join([&quot;a&quot;,null,&quot;c&quot;])\n// &quot;ac&quot;\n\nstring join([])\n// &quot;&quot;\n</code></pre>\n"
	},
	{
		name: "string join(list, delimiter)",
		description: "<p>Joins a list of strings into a single string. This is similar to\nJava&#39;s <a href=\"https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Collectors.html#joining(java.lang.CharSequence,java.lang.CharSequence,java.lang.CharSequence)\">joining</a>\nfunction.</p>\n<p>If an item of the list is <code>null</code>, the item is ignored for the result string. If an item is\nneither a string nor <code>null</code>, the function returns <code>null</code> instead of a string.</p>\n<p>The resulting string contains a <code>delimiter</code> between each element.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">string join(list: list&lt;string&gt;, delimiter: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">string join([&quot;a&quot;], &quot;X&quot;)\n// &quot;a&quot;\n\nstring join([&quot;a&quot;,&quot;b&quot;,&quot;c&quot;], &quot;, &quot;)\n// &quot;a, b, c&quot;\n</code></pre>\n"
	},
	{
		name: "string join(list, delimiter, prefix, suffix)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Joins a list of strings into a single string. This is similar to\nJava&#39;s <a href=\"https://docs.oracle.com/en/java/javase/11/docs/api/java.base/java/util/stream/Collectors.html#joining(java.lang.CharSequence,java.lang.CharSequence,java.lang.CharSequence)\">joining</a>\nfunction.</p>\n<p>If an item of the list is <code>null</code>, the item is ignored for the result string. If an item is\nneither a string nor <code>null</code>, the function returns <code>null</code> instead of a string.</p>\n<p>The resulting string starts with <code>prefix</code>, contains a <code>delimiter</code> between each element, and ends\nwith <code>suffix</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">string join(list: list&lt;string&gt;, delimiter: string, prefix: string, suffix: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">string join([&quot;a&quot;,&quot;b&quot;,&quot;c&quot;], &quot;, &quot;, &quot;[&quot;, &quot;]&quot;)\n// &quot;[a, b, c]&quot;\n</code></pre>\n"
	},
	{
		name: "decimal(n, scale)",
		description: "<p>Rounds the given value at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">decimal(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">decimal(1/3, 2)\n// .33\n\ndecimal(1.5, 0)\n// 2\n</code></pre>\n"
	},
	{
		name: "floor(n)",
		description: "<p>Rounds the given value with rounding mode flooring.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">floor(n: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">floor(1.5)\n// 1\n\nfloor(-1.5)\n// -2\n</code></pre>\n"
	},
	{
		name: "floor(n, scale)",
		description: "<p>Rounds the given value with rounding mode flooring at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">floor(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">floor(-1.56, 1)\n// -1.6\n</code></pre>\n"
	},
	{
		name: "ceiling(n)",
		description: "<p>Rounds the given value with rounding mode ceiling.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">ceiling(n: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">ceiling(1.5)\n// 2\n\nceiling(-1.5)\n// -1\n</code></pre>\n"
	},
	{
		name: "ceiling(n, scale)",
		description: "<p>Rounds the given value with rounding mode ceiling at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">ceiling(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">ceiling(-1.56, 1)\n// -1.5\n</code></pre>\n"
	},
	{
		name: "round up(n, scale)",
		description: "<p>Rounds the given value with the rounding mode round-up at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">round up(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">round up(5.5)\n// 6\n\nround up(-5.5)\n// -6\n\nround up(1.121, 2)\n// 1.13\n\nround up(-1.126, 2)\n// -1.13\n</code></pre>\n"
	},
	{
		name: "round down(n, scale)",
		description: "<p>Rounds the given value with the rounding mode round-down at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">round down(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">round down(5.5, 0)\n// 5\n\nround down (-5.5, 0)\n// -5\n\nround down (1.121, 2)\n// 1.12\n\nround down (-1.126, 2)\n// -1.12\n</code></pre>\n"
	},
	{
		name: "round half up(n, scale)",
		description: "<p>Rounds the given value with the rounding mode round-half-up at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">round half up(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">round half up(5.5, 0)\n// 6\n\nround half up(-5.5, 0)\n// -6\n\nround half up(1.121, 2)\n// 1.12\n\nround half up(-1.126, 2)\n// -1.13\n</code></pre>\n"
	},
	{
		name: "round half down(n, scale)",
		description: "<p>Rounds the given value with the rounding mode round-half-down at the given scale.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">round half down(n: number, scale: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">round half down (5.5, 0)\n// 5\n\nround half down (-5.5, 0)\n// -5\n\nround half down (1.121, 2)\n// 1.12\n\nround half down (-1.126, 2)\n// -1.13\n</code></pre>\n"
	},
	{
		name: "abs(number)",
		description: "<p>Returns the absolute value of the given numeric value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">abs(number: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">abs(10)\n// 10\n\nabs(-10)\n// 10\n</code></pre>\n"
	},
	{
		name: "modulo(dividend, divisor)",
		description: "<p>Returns the remainder of the division of dividend by divisor.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">modulo(dividend: number, divisor: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">modulo(12, 5)\n// 2\n</code></pre>\n"
	},
	{
		name: "sqrt(number)",
		description: "<p>Returns the square root of the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">sqrt(number: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">sqrt(16)\n// 4\n</code></pre>\n"
	},
	{
		name: "log(number)",
		description: "<p>Returns the natural logarithm (base e) of the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">log(number: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">log(10)\n// 2.302585092994046\n</code></pre>\n"
	},
	{
		name: "exp(number)",
		description: "<p>Returns the Euler’s number e raised to the power of the given number .</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">exp(number: number): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">exp(5)\n// 148.4131591025766\n</code></pre>\n"
	},
	{
		name: "odd(number)",
		description: "<p>Returns <code>true</code> if the given value is odd. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">odd(number: number): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">odd(5)\n// true\n\nodd(2)\n// false\n</code></pre>\n"
	},
	{
		name: "even(number)",
		description: "<p>Returns <code>true</code> if the given is even. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">even(number: number): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">even(5)\n// false\n\neven(2)\n// true\n</code></pre>\n"
	},
	{
		name: "random number()",
		description: "<p><em>Camunda Extension</em></p>\n<p>Returns a random number between <code>0</code> and <code>1</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">random number(): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">random number()\n// 0.9701618132579795\n</code></pre>\n"
	},
	{
		name: "before(point1, point2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">before(point1: Any, point2: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">before(1, 10)\n// true\n\nbefore(10, 1)\n// false\n</code></pre>\n"
	},
	{
		name: "before(range, point)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">before(range: range, point: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">before([1..5], 10)\n// true\n</code></pre>\n"
	},
	{
		name: "before(point, range)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">before(point: Any, range: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">before(1, [2..5])\n// true\n</code></pre>\n"
	},
	{
		name: "before(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">before(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">before([1..5], [6..10])\n// true\n\nbefore([1..5),[5..10])\n// true\n</code></pre>\n"
	},
	{
		name: "after(point1, point2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">after(point1: Any, point2: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">after(10, 1)\n// true\n\nafter(1, 10)\n// false\n</code></pre>\n"
	},
	{
		name: "after(range, point)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">after(range: range, point: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">after([1..5], 10)\n// false\n</code></pre>\n"
	},
	{
		name: "after(point, range)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">after(point: Any, range: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">after(12, [2..5])\n// true\n</code></pre>\n"
	},
	{
		name: "after(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">after(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">after([6..10], [1..5])\n// true\n\nafter([5..10], [1..5))\n// true\n</code></pre>\n"
	},
	{
		name: "meets(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">meets(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">meets([1..5], [5..10])\n// true\n\nmeets([1..3], [4..6])\n// false\n\nmeets([1..3], [3..5])\n// true\n\nmeets([1..5], (5..8])\n// false\n</code></pre>\n"
	},
	{
		name: "met by(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">met by(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">met by([5..10], [1..5])\n// true\n\nmet by([3..4], [1..2])\n// false\n\nmet by([3..5], [1..3])\n// true\n\nmet by((5..8], [1..5))\n// false\n\nmet by([5..10], [1..5))\n// false\n</code></pre>\n"
	},
	{
		name: "overlaps(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">overlaps(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">overlaps([5..10], [1..6])\n// true\n\noverlaps((3..7], [1..4])\n// true\n\noverlaps([1..3], (3..6])\n// false\n\noverlaps((5..8], [1..5))\n// false\n\noverlaps([4..10], [1..5))\n// true\n</code></pre>\n"
	},
	{
		name: "overlaps before(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">overlaps before(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">overlaps before([1..5], [4..10])\n// true\n\noverlaps before([3..4], [1..2])\n// false\n\noverlaps before([1..3], (3..5])\n// false\n\noverlaps before([1..5), (3..8])\n// true\n\noverlaps before([1..5), [5..10])\n// false\n</code></pre>\n"
	},
	{
		name: "overlaps after(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">overlaps after(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">overlaps after([4..10], [1..5])\n// true\n\noverlaps after([3..4], [1..2])\n// false\n\noverlaps after([3..5], [1..3))\n// false\n\noverlaps after((5..8], [1..5))\n// false\n\noverlaps after([4..10], [1..5))\n// true\n</code></pre>\n"
	},
	{
		name: "finishes(point, range)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">finishes(point: Any, range: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">finishes(5, [1..5])\n// true\n\nfinishes(10, [1..7])\n// false\n</code></pre>\n"
	},
	{
		name: "finishes(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">finishes(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">finishes([3..5], [1..5])\n// true\n\nfinishes((1..5], [1..5))\n// false\n\nfinishes([5..10], [1..10))\n// false\n</code></pre>\n"
	},
	{
		name: "finished by(range, point)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">finished by(range: range, point: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">finished by([5..10], 10)\n// true\n\nfinished by([3..4], 2)\n// false\n</code></pre>\n"
	},
	{
		name: "finished by(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">finished by(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">finished by([1..5], [3..5])\n// true\n\nfinished by((5..8], [1..5))\n// false\n\nfinished by([5..10], (1..10))\n// false\n</code></pre>\n"
	},
	{
		name: "includes(range, point)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">includes(range: range, point: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">includes([5..10], 6)\n// true\n\nincludes([3..4], 5)\n// false\n</code></pre>\n"
	},
	{
		name: "includes(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">includes(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">includes([1..10], [4..6])\n// true\n\nincludes((5..8], [1..5))\n// false\n\nincludes([1..10], [1..5))\n// true\n</code></pre>\n"
	},
	{
		name: "during(point, range)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">during(point: Any, range: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">during(5, [1..10])\n// true\n\nduring(12, [1..10])\n// false\n\nduring(1, (1..10])\n// false\n</code></pre>\n"
	},
	{
		name: "during(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">during(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">during([4..6], [1..10))\n// true\n\nduring((1..5], (1..10])\n// true\n</code></pre>\n"
	},
	{
		name: "starts(point, range)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">starts(point: Any, range: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">starts(1, [1..5])\n// true\n\nstarts(1, (1..8])\n// false\n</code></pre>\n"
	},
	{
		name: "starts(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">starts(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">starts((1..5], [1..5])\n// false\n\nstarts([1..10], [1..5])\n// false\n\nstarts((1..5), (1..10))\n// true\n</code></pre>\n"
	},
	{
		name: "started by(range, point)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">started by(range: range, point: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">started by([1..10], 1)\n// true\n\nstarted by((1..10], 1)\n// false\n</code></pre>\n"
	},
	{
		name: "started by(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">started by(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">started by([1..10], [1..5])\n// true\n\nstarted by((1..10], [1..5))\n// false\n\nstarted by([1..10], [1..10))\n// true\n</code></pre>\n"
	},
	{
		name: "coincides(point1, point2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">coincides(point1: Any, point2: Any): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">coincides(5, 5)\n// true\n\ncoincides(3, 4)\n// false\n</code></pre>\n"
	},
	{
		name: "coincides(range1, range2)",
		description: "<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">coincides(range1: range, range2: range): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">coincides([1..5], [1..5])\n// true\n\ncoincides((1..5], [1..5))\n// false\n\ncoincides([1..5], [2..6])\n// false\n</code></pre>\n"
	},
	{
		name: "substring(string, start position)",
		description: "<p>Returns a substring of the given value starting at <code>start position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">substring(string: string, start position: number): string\n</code></pre>\n<p>The <code>start position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">substring(&quot;foobar&quot;, 3)\n// &quot;obar&quot;\n</code></pre>\n"
	},
	{
		name: "substring(string, start position, length)",
		description: "<p>Returns a substring of the given value starting at <code>start position</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">substring(string: string, start position: number, length: number): string\n</code></pre>\n<p>The <code>start position</code> starts at the index <code>1</code>. The last position is <code>-1</code>.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">substring(&quot;foobar&quot;, 3, 3)\n// &quot;oba&quot;\n</code></pre>\n"
	},
	{
		name: "string length(string)",
		description: "<p>Returns the number of characters in the given value.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">string length(string: string): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">string length(&quot;foo&quot;)\n// 3\n</code></pre>\n"
	},
	{
		name: "upper case(string)",
		description: "<p>Returns the given value with all characters are uppercase.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">upper case(string: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">upper case(&quot;aBc4&quot;)\n// &quot;ABC4&quot;\n</code></pre>\n"
	},
	{
		name: "lower case(string)",
		description: "<p>Returns the given value with all characters are lowercase.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">lower case(string: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">lower case(&quot;aBc4&quot;)\n// &quot;abc4&quot;\n</code></pre>\n"
	},
	{
		name: "substring before(string, match)",
		description: "<p>Returns a substring of the given value that contains all characters before <code>match</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">substring before(string: string, match: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">substring before(&quot;foobar&quot;, &quot;bar&quot;)\n// &quot;foo&quot;\n</code></pre>\n"
	},
	{
		name: "substring after(string, match)",
		description: "<p>Returns a substring of the given value that contains all characters after <code>match</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">substring after(string: string, match: string): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">substring after(&quot;foobar&quot;, &quot;ob&quot;)\n// &quot;ar&quot;\n</code></pre>\n"
	},
	{
		name: "contains(string, match)",
		description: "<p>Returns <code>true</code> if the given value contains the substring <code>match</code>. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">contains(string: string, match: string): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">contains(&quot;foobar&quot;, &quot;of&quot;)\n// false\n</code></pre>\n"
	},
	{
		name: "starts with(string, match)",
		description: "<p>Returns <code>true</code> if the given value starts with the substring <code>match</code>. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">starts with(string: string, match: string): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">starts with(&quot;foobar&quot;, &quot;fo&quot;)\n// true\n</code></pre>\n"
	},
	{
		name: "ends with(string, match)",
		description: "<p>Returns <code>true</code> if the given value ends with the substring <code>match</code>. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">ends with(string: string, match: string): boolean\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">ends with(&quot;foobar&quot;, &quot;r&quot;)\n// true\n</code></pre>\n"
	},
	{
		name: "matches(input, pattern)",
		description: "<p>Returns <code>true</code> if the given value matches the <code>pattern</code>. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">matches(input: string, pattern: string): boolean\n</code></pre>\n<p>The <code>pattern</code> is a string that contains a regular expression.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">matches(&quot;foobar&quot;, &quot;^fo*bar&quot;)\n// true\n</code></pre>\n"
	},
	{
		name: "matches(input, pattern, flags)",
		description: "<p>Returns <code>true</code> if the given value matches the <code>pattern</code>. Otherwise, returns <code>false</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">matches(input: string, pattern: string, flags: string): boolean\n</code></pre>\n<p>The <code>pattern</code> is a string that contains a regular expression.</p>\n<p>The <code>flags</code> can contain one or more of the following characters:</p>\n<ul>\n<li><code>s</code> (dot-all)</li>\n<li><code>m</code> (multi-line)</li>\n<li><code>i</code> (case insensitive)</li>\n<li><code>x</code> (comments)</li>\n</ul>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">matches(&quot;FooBar&quot;, &quot;foo&quot;, &quot;i&quot;)\n// true\n</code></pre>\n"
	},
	{
		name: "replace(input, pattern, replacement)",
		description: "<p>Returns the resulting string after replacing all occurrences of <code>pattern</code> with <code>replacement</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">replace(input: string, pattern: string, replacement: string): string\n</code></pre>\n<p>The <code>pattern</code> is a string that contains a regular expression.</p>\n<p>The <code>replacement</code> can access the match groups by using <code>$</code> and the number of the group, for example,\n<code>$1</code> to access the first group.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">replace(&quot;abcd&quot;, &quot;(ab)|(a)&quot;, &quot;[1=$1][2=$2]&quot;)\n// &quot;[1=ab][2=]cd&quot;\n\nreplace(&quot;0123456789&quot;, &quot;(\\d{3})(\\d{3})(\\d{4})&quot;, &quot;($1) $2-$3&quot;)\n// &quot;(012) 345-6789&quot;\n</code></pre>\n"
	},
	{
		name: "replace(input, pattern, replacement, flags)",
		description: "<p>Returns the resulting string after replacing all occurrences of <code>pattern</code> with <code>replacement</code>.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">replace(input: string, pattern: string, replacement: string, flags: string): string\n</code></pre>\n<p>The <code>pattern</code> is a string that contains a regular expression.</p>\n<p>The <code>replacement</code> can access the match groups by using <code>$</code> and the number of the group, for example,\n<code>$1</code> to access the first group.</p>\n<p>The <code>flags</code> can contain one or more of the following characters:</p>\n<ul>\n<li><code>s</code> (dot-all)</li>\n<li><code>m</code> (multi-line)</li>\n<li><code>i</code> (case insensitive)</li>\n<li><code>x</code> (comments)</li>\n</ul>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">replace(&quot;How do you feel?&quot;, &quot;Feel&quot;, &quot;FEEL&quot;, &quot;i&quot;)\n// &quot;How do you FEEL?&quot;\n</code></pre>\n"
	},
	{
		name: "split(string, delimiter)",
		description: "<p>Splits the given value into a list of substrings, breaking at each occurrence of the <code>delimiter</code> pattern.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">split(string: string, delimiter: string): list&lt;string&gt;\n</code></pre>\n<p>The <code>delimiter</code> is a string that contains a regular expression.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">split(&quot;John Doe&quot;, &quot;\\s&quot; )\n// [&quot;John&quot;, &quot;Doe&quot;]\n\nsplit(&quot;a;b;c;;&quot;, &quot;;&quot;)\n// [&quot;a&quot;, &quot;b&quot;, &quot;c&quot;, &quot;&quot;, &quot;&quot;]\n</code></pre>\n"
	},
	{
		name: "extract(string, pattern)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Returns all matches of the pattern in the given string. Returns an empty list if the pattern doesn&#39;t\nmatch.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">extract(string: string, pattern: string): list&lt;string&gt;\n</code></pre>\n<p>The <code>pattern</code> is a string that contains a regular expression.</p>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">extract(&quot;references are 1234, 1256, 1378&quot;, &quot;12[0-9]*&quot;)\n// [&quot;1234&quot;,&quot;1256&quot;]\n</code></pre>\n"
	},
	{
		name: "now()",
		description: "<p>Returns the current date and time including the timezone.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">now(): date and time\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">now()\n// date and time(&quot;2020-07-31T14:27:30@Europe/Berlin&quot;)\n</code></pre>\n"
	},
	{
		name: "today()",
		description: "<p>Returns the current date.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">today(): date\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">today()\n// date(&quot;2020-07-31&quot;)\n</code></pre>\n"
	},
	{
		name: "day of week(date)",
		description: "<p>Returns the day of the week according to the Gregorian calendar. Note that it always returns the English name of the day.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">day of week(date: date): string\n</code></pre>\n<pre><code class=\"language-feel\">day of week(date: date and time): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">day of week(date(&quot;2019-09-17&quot;))\n// &quot;Tuesday&quot;\n\nday of week(date and time(&quot;2019-09-17T12:00:00&quot;))\n// &quot;Tuesday&quot;\n</code></pre>\n"
	},
	{
		name: "day of year(date)",
		description: "<p>Returns the Gregorian number of the day within the year.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">day of year(date: date): number\n</code></pre>\n<pre><code class=\"language-feel\">day of year(date: date and time): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">day of year(date(&quot;2019-09-17&quot;))\n// 260\n\nday of year(date and time(&quot;2019-09-17T12:00:00&quot;))\n// 260\n</code></pre>\n"
	},
	{
		name: "week of year(date)",
		description: "<p>Returns the Gregorian number of the week within the year, according to ISO 8601.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">week of year(date: date): number\n</code></pre>\n<pre><code class=\"language-feel\">week of year(date: date and time): number\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">week of year(date(&quot;2019-09-17&quot;))\n// 38\n\nweek of year(date and time(&quot;2019-09-17T12:00:00&quot;))\n// 38\n</code></pre>\n"
	},
	{
		name: "month of year(date)",
		description: "<p>Returns the month of the year according to the Gregorian calendar. Note that it always returns the English name of the month.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">month of year(date: date): string\n</code></pre>\n<pre><code class=\"language-feel\">month of year(date: date and time): string\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">month of year(date(&quot;2019-09-17&quot;))\n// &quot;September&quot;\n\nmonth of year(date and time(&quot;2019-09-17T12:00:00&quot;))\n// &quot;September&quot;\n</code></pre>\n"
	},
	{
		name: "abs(n)",
		description: "<p>Returns the absolute value of a given duration.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">abs(n: days and time duration): days and time duration\n</code></pre>\n<pre><code class=\"language-feel\">abs(n: years and months duration): years and months duration\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">abs(duration(&quot;-PT5H&quot;))\n// &quot;duration(&quot;PT5H&quot;)&quot;\n\nabs(duration(&quot;PT5H&quot;))\n// &quot;duration(&quot;PT5H&quot;)&quot;\n\nabs(duration(&quot;-P2M&quot;))\n// duration(&quot;P2M&quot;)\n</code></pre>\n"
	},
	{
		name: "last day of month(date)",
		description: "<p><em>Camunda Extension</em></p>\n<p>Takes the month of the given date or date-time value and returns the last day of this month.</p>\n<p><strong>Function signature</strong></p>\n<pre><code class=\"language-feel\">last day of month(date: date): date\n</code></pre>\n<pre><code class=\"language-feel\">last day of month(date: date and time): date\n</code></pre>\n<p><strong>Examples</strong></p>\n<pre><code class=\"language-feel\">last day of month(date(&quot;2022-10-01&quot;))\n// date(&quot;2022-10-31&quot;))\n\nlast day of month(date and time(&quot;2022-10-16T12:00:00&quot;))\n// date(&quot;2022-10-31&quot;))\n</code></pre>\n"
	}
];

const options = tags.map(tag => {
  const match = tag.name.match(/^([\w\s]+)\((.*)\)$/);
  const functionName = match[1];
  const functionArguments = match[2];

  const placeHolders = functionArguments
    .split(', ')
    .map((arg) => `\${${arg}}`)
    .join(', ');

  return snippetCompletion(
    `${functionName}(${placeHolders})`,
    {
      label: tag.name,
      type: 'function',
      info: () => {
        const html = domify(`<div class="description">${tag.description}<div>`);
        return html;
      },
      boost: -1
    }
  );
});

var builtins = context => {

  let nodeBefore = syntaxTree(context.state).resolve(context.pos, -1);

  // For the special case of empty nodes, we need to check the current node
  // as well. The previous node could be part of another token, e.g.
  // when typing functions "abs(".
  let nextNode = nodeBefore.nextSibling;
  const isInEmptyNode =
        isNodeEmpty(nodeBefore) ||
        nextNode && nextNode.from === context.pos && isNodeEmpty(nextNode);

  if (isInEmptyNode) {
    return context.explicit ? {
      from: context.pos,
      options: options
    } : null;
  }

  // Don't auto-complete on path expressions/context keys/...
  if ((nodeBefore.parent && nodeBefore.parent.name !== 'VariableName') || isPathExpression(nodeBefore)) {
    return null;
  }

  return {
    from: nodeBefore.from,
    options: options
  };
};

/**
 * @type {Facet<import('..').Variable[]>} Variable
 */
const variablesFacet = Facet.define();

var pathExpression = context => {
  const variables = context.state.facet(variablesFacet)[0];
  const nodeBefore = syntaxTree(context.state).resolve(context.pos, -1);

  if (!isPathExpression(nodeBefore)) {
    return;
  }

  const expression = findPathExpression(nodeBefore);

  // if the cursor is directly after the `.`, variable starts at the cursor position
  const from = nodeBefore === expression ? context.pos : nodeBefore.from;

  const path = getPath(expression, context);

  let options = variables;
  for (var i = 0; i < path.length - 1; i++) {
    var childVar = options.find(val => val.name === path[i].name);

    if (!childVar) {
      return null;
    }

    // only suggest if variable type matches
    if (
      childVar.isList !== 'optional' &&
      !!childVar.isList !== path[i].isList
    ) {
      return;
    }

    options = childVar.entries;
  }

  if (!options) return;

  options = options.map(v => ({
    label: v.name,
    type: 'variable',
    info: v.info,
    detail: v.detail
  }));

  const result = {
    from: from,
    options: options
  };

  return result;
};


function findPathExpression(node) {
  while (node) {
    if (node.name === 'PathExpression') {
      return node;
    }
    node = node.parent;
  }
}

// parses the path expression into a list of variable names with type information
// e.g. foo[0].bar => [ { name: 'foo', isList: true }, { name: 'bar', isList: false } ]
function getPath(node, context) {
  let path = [];

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === 'PathExpression') {
      path.push(...getPath(child, context));
    } else if (child.name === 'FilterExpression') {
      path.push(...getFilter(child, context));
    }
    else {
      path.push({
        name: getNodeContent(child, context),
        isList: false
      });
    }
  }
  return path;
}

function getFilter(node, context) {
  const list = node.firstChild;

  if (list.name === 'PathExpression') {
    const path = getPath(list, context);
    const last = path[path.length - 1];
    last.isList = true;

    return path;
  }

  return [ {
    name: getNodeContent(list, context),
    isList: true
  } ];
}

function getNodeContent(node, context) {
  return context.state.sliceDoc(node.from, node.to);
}

/**
 * @type {import('@codemirror/autocomplete').CompletionSource}
 */
var variables = context => {

  const variables = context.state.facet(variablesFacet)[0];

  const options = variables.map(v => ({
    label: v.name,
    type: 'variable',
    info: v.info,
    detail: v.detail
  }));

  // In most cases, use what is typed before the cursor
  let nodeBefore = syntaxTree(context.state).resolve(context.pos, -1);

  // For the special case of empty nodes, we need to check the current node
  // as well. The previous node could be part of another token, e.g.
  // when typing functions "abs(".
  let nextNode = nodeBefore.nextSibling;
  const isInEmptyNode =
        isNodeEmpty(nodeBefore) ||
        nextNode && nextNode.from === context.pos && isNodeEmpty(nextNode);

  if (isInEmptyNode) {
    return context.explicit ? {
      from: context.pos,
      options: options
    } : null;
  }

  const result = {
    from: nodeBefore.from,
    options: options
  };

  // Only auto-complete variables
  if ((nodeBefore.parent && nodeBefore.parent.name !== 'VariableName') || isPathExpression(nodeBefore)) {
    return null;
  }

  return result;
};

function autocompletion() {
  return [
    autocompletion$1({
      override: [
        variables,
        builtins,
        completeFromList(snippets.map(s => ({ ...s, boost: -1 }))),
        pathExpression,
        ...keywordCompletions
      ]
    })
  ];
}

function language() {
  return new LanguageSupport(feelLanguage, [ ]);
}

var linter = [ linter$1(cmFeelLinter()) ];

const baseTheme = EditorView.theme({
  '& .cm-content': {
    padding: '0px',
  },
  '& .cm-line': {
    padding: '0px',
  },
  '&.cm-editor.cm-focused': {
    outline: 'none',
  },
  '& .cm-completionInfo': {
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  // Don't wrap whitespace for custom HTML
  '& .cm-completionInfo > *': {
    whiteSpace: 'normal'
  },
  '& .cm-completionInfo ul': {
    margin: 0,
    paddingLeft: '15px'
  },
  '& .cm-completionInfo pre': {
    marginBottom: 0,
    whiteSpace: 'pre-wrap'
  },
  '& .cm-completionInfo p': {
    marginTop: 0,
  },
  '& .cm-completionInfo p:not(:last-of-type)': {
    marginBottom: 0,
  }
});

const highlightTheme = EditorView.baseTheme({
  '& .variableName': {
    color: '#10f'
  },
  '& .number': {
    color: '#164'
  },
  '& .string': {
    color: '#a11'
  },
  '& .bool': {
    color: '#219'
  },
  '& .function': {
    color: '#aa3731',
    fontWeight: 'bold'
  },
  '& .control': {
    color: '#708'
  }
});

const syntaxClasses = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags$1.variableName, class: 'variableName' },
    { tag: tags$1.name, class: 'variableName' },
    { tag: tags$1.number, class: 'number' },
    { tag: tags$1.string, class: 'string' },
    { tag: tags$1.bool, class: 'bool' },
    { tag: tags$1.function(tags$1.variableName), class: 'function' },
    { tag: tags$1.function(tags$1.special(tags$1.variableName)), class: 'function' },
    { tag: tags$1.controlKeyword, class: 'control' },
    { tag: tags$1.operatorKeyword, class: 'control' }
  ])
);

var theme = [ baseTheme, highlightTheme, syntaxClasses ];

/**
 * @typedef {object} Variable
 * @typedef {import('@codemirror/state').Extension} Extension
 * @property {string} name name or key of the variable
 * @property {string} [info] short information about the variable, e.g. type
 * @property {string} [detail] longer description of the variable content
 * @property {boolean} [isList] whether the variable is a list
 * @property {array<Variable>} [schema] array of child variables if the variable is a context or list
 */

const autocompletionConf = new Compartment();

/**
 * Creates a FEEL editor in the supplied container
 *
 * @param {Object} config
 * @param {DOMNode} config.container
 * @param {Extension[]} [config.extensions]
 * @param {DOMNode|String} [config.tooltipContainer]
 * @param {Function} [config.onChange]
 * @param {Function} [config.onKeyDown]
 * @param {Function} [config.onLint]
 * @param {Boolean} [config.readOnly]
 * @param {String} [config.value]
 * @param {Variable[]} [config.variables]
 *
 * @returns {Object} editor
 */
function FeelEditor({
  extensions: editorExtensions = [],
  container,
  tooltipContainer,
  onChange = () => {},
  onKeyDown = () => {},
  onLint = () => {},
  readOnly = false,
  value = '',
  variables = []
}) {

  const changeHandler = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

  const lintHandler = EditorView.updateListener.of((update) => {
    const diagnosticEffects = update.transactions
      .flatMap(t => t.effects)
      .filter(effect => effect.is(setDiagnosticsEffect));

    if (!diagnosticEffects.length) {
      return;
    }

    const messages = diagnosticEffects.flatMap(effect => effect.value);

    onLint(messages);
  });

  const keyHandler = EditorView.domEventHandlers(
    {
      keydown: onKeyDown
    }
  );

  if (typeof tooltipContainer === 'string') {
    tooltipContainer = document.querySelector(tooltipContainer);
  }

  const tooltipLayout = tooltipContainer ? tooltips({
    tooltipSpace: function() {
      return tooltipContainer.getBoundingClientRect();
    }
  }) : [];

  const extensions = [
    autocompletionConf.of(variablesFacet.of(variables)),
    autocompletion(),
    bracketMatching(),
    changeHandler,
    closeBrackets(),
    indentOnInput(),
    keyHandler,
    keymap.of([
      ...defaultKeymap,
    ]),
    language(),
    linter,
    lintHandler,
    tooltipLayout,
    theme,
    ...editorExtensions
  ];

  if (readOnly) {
    extensions.push(EditorView.editable.of(false));
  }

  this._cmEditor = new EditorView({
    state: EditorState.create({
      doc: value,
      extensions: extensions
    }),
    parent: container
  });

  return this;
}

/**
 * Replaces the content of the Editor
 *
 * @param {String} value
 */
FeelEditor.prototype.setValue = function(value) {
  this._cmEditor.dispatch({
    changes: {
      from: 0,
      to: this._cmEditor.state.doc.length,
      insert: value,
    }
  });
};

/**
 * Sets the focus in the editor.
 */
FeelEditor.prototype.focus = function(position) {
  const cmEditor = this._cmEditor;

  // the Codemirror `focus` method always calls `focus` with `preventScroll`,
  // so we have to focus + scroll manually
  cmEditor.contentDOM.focus();
  cmEditor.focus();

  if (typeof position === 'number') {
    const end = cmEditor.state.doc.length;
    cmEditor.dispatch({ selection: { anchor: position <= end ? position : end } });
  }
};

/**
 * Returns the current selection ranges. If no text is selected, a single
 * range with the start and end index at the cursor position will be returned.
 *
 * @returns {Object} selection
 * @returns {Array} selection.ranges
 */
FeelEditor.prototype.getSelection = function() {
  return this._cmEditor.state.selection;
};

/**
 * Set variables to be used for autocompletion.
 * @param {Variable[]} variables
 * @returns {void}
 */
FeelEditor.prototype.setVariables = function(variables) {
  this._cmEditor.dispatch({
    effects: autocompletionConf.reconfigure(variablesFacet.of(variables))
  });
};

export { FeelEditor as default };