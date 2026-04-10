<button
  onClick={async () => {
    console.log("TEST BUTTON CLICKED");

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([{ user_id: user?.id, subject: "Test", score: 5 }]);

    console.log("TEST DATA:", data);
    console.log("TEST ERROR:", error);
  }}
>
  Test Insert
</button>