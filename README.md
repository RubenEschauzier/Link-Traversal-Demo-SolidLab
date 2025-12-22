## SolidLab Demo Link Traversal
This demo shows how link traversal could be used for a social media application. In this demo you can
- Log in and view your profile details
- Find all the people you know
- Display information of a specific person
- Find all Forums you are part of and their member counts
- Go to a forum detail page to find its moderator and members
- Go to member pages to get their details.

The underlying data is from [SolidBench](https://github.com/SolidBench/SolidBench.js/), which simulates the Solid environment. All information is retrieved using client-side link traversal queries.
Additionally there is option to view the executed queries, the logger output, and the traversal graph taken by the engine. Note that this significantly slows down query execution.

## TODO:

- [ ] Logger filter does not work properly it 1. can't filter out determined first entry logs for binding join. 
Also that log doesn't show the entry properly. 2. It doesn't filter out things that should be filtered out. Probably
something async. (before Ruben T)
- [ ] Authentication either through fake account or real authentication
- [ ] Truncate large graphs. Do so based on dereferenceOrder. Keep any discovered children of dereferenced URIs + Add an indicator saying the topology is truncated for performance considerations.
