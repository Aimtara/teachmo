import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code, Book, GitPullRequest, Palette } from 'lucide-react';

const ReadmeContent = () => (
  <div className="prose prose-sm max-w-none">
    <h2 id="welcome-to-teachmo">Welcome to Teachmo!</h2>
    <p>This document serves as the central guide for developers working on the Teachmo platform. Teachmo is an AI-powered parenting coach designed to provide personalized activities, expert advice, and progress tracking to help children thrive.</p>
    
    <h3 id="tech-stack">Core Technology Stack</h3>
    <ul>
      <li><strong>Frontend:</strong> React, Vite, TailwindCSS</li>
      <li><strong>UI Components:</strong> shadcn/ui</li>
      <li><strong>Icons:</strong> Lucide React</li>
      <li><strong>Backend/Data:</strong> base44 Platform (handles database, auth, functions)</li>
      <li><strong>State Management:</strong> React Hooks (useState, useContext, useReducer)</li>
      <li><strong>Testing:</strong> Jest, React Testing Library</li>
    </ul>

    <h3 id="project-architecture">Project Architecture</h3>
    <p>The project follows a feature-driven file structure, organized as follows:</p>
    <ul>
      <li><code>/components</code>: Reusable UI components. Sub-divided by feature (e.g., <code>/components/dashboard</code>, <code>/components/activities</code>). Shared components are in <code>/components/shared</code>.</li>
      <li><code>/pages</code>: Top-level route components. Each file corresponds to a page in the application.</li>
      <li><code>/entities</code>: JSON schema definitions for all data models. These define the shape of our data in the base44 database.</li>
      <li><code>/functions</code>: Serverless backend functions for integrating with external APIs.</li>
      <li><code>Layout.js</code>: The main application layout component that wraps all pages.</li>
      <li><code>globals.css</code>: Global styles and TailwindCSS definitions.</li>
    </ul>

    <h3 id="getting-started">Getting Started</h3>
    <p>The Teachmo application is developed on the base44 platform, which streamlines setup:</p>
    <ol>
      <li>Log in to your base44 account.</li>
      <li>Open the Teachmo project in the web-based IDE.</li>
      <li>The application will automatically be running in the preview pane.</li>
      <li>All changes you make to the code will be hot-reloaded in the preview instantly.</li>
    </ol>

    <h3 id="key-conventions">Key Conventions</h3>
    <ul>
      <li><strong>State Management:</strong> For local component state, use <code>useState</code>. For complex state, use <code>useReducer</code>. For global state, use React Context (see <code>AccessibilityProvider</code>).</li>
      <li><strong>API Calls:</strong> Use the custom hook <code>useApi</code> (located in <code>/components/hooks/useApi.jsx</code>) for all interactions with entities and functions. This standardizes loading, error, and success states.</li>
      <li><strong>Styling:</strong> Use TailwindCSS utility classes for all styling. Avoid custom CSS files unless absolutely necessary.</li>
      <li><strong>Naming:</strong> Components are <code>PascalCase</code>. Functions and variables are <code>camelCase</code>.</li>
    </ul>
    
    <h3 id="testing">Testing</h3>
    <p>Our testing strategy relies on Jest and React Testing Library. Test files are co-located with the components they test (e.g., <code>Dashboard.test.jsx</code>). Core testing utilities can be found in <code>/components/testing/TestUtils.jsx</code>.</p>
  </div>
);

const ContributingContent = () => (
  <div className="prose prose-sm max-w-none">
    <h2 id="contributing-to-teachmo">Contributing to Teachmo</h2>
    <p>We welcome contributions from all developers. To ensure a smooth process, please adhere to the following guidelines.</p>

    <h3 id="development-workflow">Development Workflow</h3>
    <ol>
      <li>Select an issue or feature to work on.</li>
      <li>All development happens directly within the base44 IDE. There is no need for local setup or branching.</li>
      <li>As you code, ensure your changes are reflected correctly in the live preview.</li>
      <li>Follow the established code style (see the Code Style tab).</li>
      <li>Once your feature is complete and tested, use the platform's deployment features to submit your changes for review.</li>
    </ol>
    
    <h3 id="commit-messages">Commit Messages / Change Descriptions</h3>
    <p>When submitting your work, provide a clear and concise description of the changes. We follow the Conventional Commits specification. Each message should consist of a header, a body, and a footer.</p>
    <pre><code>
      {`feat(activities): Add lazy loading to map view
      
- Implemented React.lazy for the MapView component to improve initial load performance.
- Added a loading skeleton for the map.

Fixes #123`}
    </code></pre>
    <p><strong>Types:</strong> <code>feat</code>, <code>fix</code>, <code>docs</code>, <code>style</code>, <code>refactor</code>, <code>perf</code>, <code>test</code>, <code>chore</code>.</p>

    <h3 id="code-of-conduct">Code of Conduct</h3>
    <p>All contributors are expected to adhere to our Code of Conduct. Please be respectful and constructive in all communications.</p>
  </div>
);

const CodeStyleContent = () => (
  <div className="prose prose-sm max-w-none">
    <h2 id="teachmo-code-style-guide">Teachmo Code Style Guide</h2>
    <p>Consistency is key to a maintainable codebase. Please follow these style guidelines.</p>

    <h3 id="javascript-react">JavaScript/React</h3>
    <ul>
      <li>Use modern JavaScript (ES6+).</li>
      <li>Always use functional components with Hooks. Avoid class components.</li>
      <li>Destructure props at the top of the component.</li>
      <li>Use implicit returns for simple, single-line JSX.</li>
      <li>Keep components small and focused. If a component gets too large, break it down.</li>
    </ul>

    <h3 id="component-structure">Component Structure</h3>
    <p>Organize your components in the following order:</p>
    <ol>
      <li>Imports</li>
      <li>Component definition</li>
      <li>State management (<code>useState</code>, <code>useReducer</code>)</li>
      <li>Other hooks (<code>useContext</code>, <code>useEffect</code>, <code>useCallback</code>)</li>
      <li>Event handlers and other functions</li>
      <li>The <code>return</code> statement with JSX</li>
    </ol>
    
    <h3 id="naming-conventions">Naming Conventions</h3>
    <ul>
      <li><strong>Components:</strong> <code>PascalCase</code> (e.g., <code>ActivityCard.jsx</code>)</li>
      <li><strong>Functions/Variables:</strong> <code>camelCase</code> (e.g., <code>handleComplete</code>)</li>
      <li><strong>Hooks:</strong> Must start with <code>use</code> (e.g., <code>useApi</code>)</li>
    </ul>

    <h3 id="styling">Styling</h3>
    <p>Use TailwindCSS utility classes directly in your JSX. Do not add custom CSS unless it is for a complex animation or a style that cannot be achieved with utilities.</p>

    <h3 id="accessibility-a11y">Accessibility (a11y)</h3>
    <ul>
      <li>All interactive elements must be keyboard accessible.</li>
      <li>Images must have descriptive <code>alt</code> tags.</li>
      <li>Use semantic HTML (<code>main</code>, <code>nav</code>, <code>article</code>, etc.).</li>
      <li>Ensure form elements have associated labels.</li>
    </ul>
  </div>
);

export default function DocumentationViewer() {
  return (
    <Card>
      <CardContent className="p-2 sm:p-4">
        <Tabs defaultValue="readme">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="readme"><Book className="w-4 h-4 mr-2" /> README.md</TabsTrigger>
            <TabsTrigger value="contributing"><GitPullRequest className="w-4 h-4 mr-2" />CONTRIBUTING.md</TabsTrigger>
            <TabsTrigger value="style"><Palette className="w-4 h-4 mr-2" />CODE_STYLE.md</TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[70vh] mt-4 p-4">
            <TabsContent value="readme"><ReadmeContent /></TabsContent>
            <TabsContent value="contributing"><ContributingContent /></TabsContent>
            <TabsContent value="style"><CodeStyleContent /></TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
