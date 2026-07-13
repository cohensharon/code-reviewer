- run server (from server directory): "npm run dev"

- curl command for running review:

"""
curl -X POST http://localhost:3000/api/reviews \

-H "Content-Type: application/json" \

-d '{

    "prUrl": "https://github.com/my-org/my-repo/pull/123",

    "ticketText": "User should not be able to submit an empty form."

}'

"""
