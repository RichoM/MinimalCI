# manual_cicd

In case git asks you for the ssh passphrase, run the following before starting the process:

    $ start-ssh-agent.cmd

It should prompt you for the ssh passphrase once and then remember it for the rest of the session. In case you need it, the file should be installed in `%HOME%\AppData\Local\Programs\Git\cmd\start-ssh-agent.cmd`.

To start the process in development mode:

    $ npx nodemon --inspect .
