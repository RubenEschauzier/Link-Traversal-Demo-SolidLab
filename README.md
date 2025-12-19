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

- [ ] Logger for forum list breaks the query, without it it is fast
- [ ] Authentication either through fake account or real authentication (after Ruben T is back)
- [ ] Topology visualizer using statistic-traversal-topology (before Ruben T is back)

